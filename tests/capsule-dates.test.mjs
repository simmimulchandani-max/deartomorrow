import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);

// Execute the actual TS handlers with an isolated clock and in-memory services.
// No environment files, network requests, production credentials, or emails.
function fixture(instant) {
  const clock = { now: Date.parse(instant) };
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clock.now])); }
    static now() { return clock.now; }
  }
  const capsule = {
    id: '5a9fbfc2-48e7-4d80-8753-a210cacdd00d', title: "Emma's 29th",
    share_slug: 'emma-capsule', owner_user_id: 'owner', is_gift: true,
    submission_deadline: '2026-11-10', unlock_date: '2026-11-11',
    recipient_email: 'emma@example.test', recipient_email_sent_at: null,
    owner_gift_confirmation_sent_at: '2026-11-10T14:41:00Z',
    capsule_unlock_email_sent_at: null, unlock_email_attempted_at: null,
  };
  const memories = [{ id: 'old-memory', capsule_id: capsule.id, contributor_name: 'Friend', title: 'Earlier', message: 'Hello', media_urls: ['existing-photo'] }];
  const tables = { capsules: [capsule], capsule_memories: memories, memories: [] };
  const sent = [];
  const updates = [];
  let beforeUpdate = () => {};
  let updateError = null;
  let mockFetch = () => { throw new Error('Unexpected network request in test'); };
  function matches(row, condition) {
    const [key, op, ...rest] = condition.split('.');
    const value = rest.join('.');
    return op === 'is' ? row[key] == null : op === 'lt' ? row[key] < value : false;
  }
  const db = {
    from(table) {
      const filters = [];
      let patch, inserted, head = false;
      const query = {
        select(_columns, options) { head = options?.head || false; return this; },
        eq(key, value) { filters.push(row => row[key] === value); return this; },
        lte(key, value) { filters.push(row => row[key] <= value); return this; },
        gt(key, value) { filters.push(row => row[key] > value); return this; },
        is(key) { filters.push(row => row[key] == null); return this; },
        not(key) { filters.push(row => row[key] != null); return this; },
        or(expression) { filters.push(row => expression.split(',').some(c => matches(row, c))); return this; },
        order() { return this; }, limit() { return this; },
        update(value) { patch = value; return this; },
        insert(value) { inserted = value; return this; },
        result(single = false) {
          if (inserted) { tables[table].push(inserted); return { data: inserted, error: null }; }
          if (patch) {
            beforeUpdate(table, patch);
            if (updateError) return { data: null, error: updateError };
          }
          const rows = tables[table].filter(row => filters.every(f => f(row)));
          if (patch) rows.forEach(row => { updates.push({ table, id: row.id, patch }); Object.assign(row, patch); });
          return { data: head ? null : single ? rows[0] || null : rows, count: rows.length, error: null };
        },
        maybeSingle() { return Promise.resolve(this.result(true)); },
        single() { return Promise.resolve(this.result(true)); },
        then(resolve, reject) { return Promise.resolve(this.result()).then(resolve, reject); },
      };
      return query;
    },
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'owner@example.test', user_metadata: { name: 'Owner' } } }, error: null }) } },
    storage: { from: () => ({ createSignedUploadUrl: async storagePath => ({ data: { signedUrl: 'https://example.test/upload', path: storagePath, token: 'fake' }, error: null }) }) },
  };
  let user = { id: 'emma', email: 'emma@example.test', email_confirmed_at: '2026-01-01' };
  const mocks = {
    'server-only': {},
    '@/lib/supabaseAdmin': { getSupabaseAdminClient: () => db },
    '@/lib/serverAuth': {
      getUserFromRequest: async () => user,
      requireUserFromRequest: async () => user ? { user, response: null } : { user: null, response: Response.json({ error: 'Login required' }, { status: 401 }) },
    },
    '@/lib/privateMedia': { getPrivateMediaBucket: () => 'private', createAuthorizedMediaUrls: async urls => urls.map(url => `signed:${url}`) },
    '@/lib/generateId': { generateId: () => 'generated-id' },
    '@/lib/emailTemplates': new Proxy({}, { get: () => () => ({ text: 'test', react: null }) }),
    resend: { Resend: class { emails = { send: async email => { sent.push(email); return { data: { id: 'mock-email' }, error: null }; } }; } },
  };
  const cache = new Map();
  function load(filename) {
    const absolute = path.resolve(filename);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const loadedModule = { exports: {} };
    cache.set(absolute, loadedModule);
    const js = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const requireMock = name => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith('@/')) return load(`${name.slice(2)}${fs.existsSync(`${name.slice(2)}.ts`) ? '.ts' : '.tsx'}`);
      return require(name);
    };
    vm.runInNewContext(js, { module: loadedModule, exports: loadedModule.exports, require: requireMock, Date: ClockDate, Intl, Response, Request, URL, crypto: globalThis.crypto, fetch: (...args) => mockFetch(...args),
      process: { env: { NODE_ENV: 'test', RESEND_API_KEY: 'fake', NEXT_PUBLIC_SITE_URL: 'https://example.test' } },
      console: { log() {}, warn() {}, error() {} },
    }, { filename: absolute });
    return loadedModule.exports;
  }
  return { clock, capsule, memories, sent, updates, load,
    setUser(value) { user = value; },
    setBeforeUpdate(fn) { beforeUpdate = fn; },
    setUpdateError(value) { updateError = value; },
    mockModule(name, value) { mocks[name] = value; },
    setFetch(fn) { mockFetch = fn; },
  };
}

const context = { params: Promise.resolve({ id: 'emma-capsule' }) };
const request = body => new Request('https://example.test/api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

for (const [label, deadline, unlock, boundary] of [
  ['Emma / standard time', '2026-11-10', '2026-11-11', '2026-11-11T05:00:00Z'],
  ['summer time', '2026-07-10', '2026-07-11', '2026-07-11T04:00:00Z'],
  ['spring DST day (23 hours)', '2026-03-08', '2026-03-09', '2026-03-09T04:00:00Z'],
  ['fall DST day (25 hours)', '2026-11-01', '2026-11-02', '2026-11-02T05:00:00Z'],
]) {
  test(`${label}: submissions and unlock switch at Eastern midnight`, () => {
    const f = fixture(boundary);
    const dates = f.load('lib/capsuleDates.ts');
    const before = new Date(Date.parse(boundary) - 1);
    assert.equal(dates.capsuleDateOnly(before), deadline);
    assert.equal(dates.capsuleSubmissionsOpen(deadline, before), true);
    assert.equal(dates.hasCapsuleUnlocked(unlock, before), false);
    assert.equal(dates.capsuleDateOnly(), unlock);
    assert.equal(dates.capsuleSubmissionsOpen(deadline), false);
    assert.equal(dates.hasCapsuleUnlocked(unlock), true);
  });
}

test('both repeated fall hours and the spring jump stay on the same Eastern date', () => {
  const { load } = fixture('2026-01-01T12:00:00Z');
  const { capsuleDateOnly } = load('lib/capsuleDates.ts');
  for (const instant of ['2026-11-01T05:30:00Z', '2026-11-01T06:30:00Z']) assert.equal(capsuleDateOnly(new Date(instant)), '2026-11-01');
  for (const instant of ['2026-03-08T06:59:59Z', '2026-03-08T07:00:00Z']) assert.equal(capsuleDateOnly(new Date(instant)), '2026-03-08');
});

test('calendar dates are independent of the host or browser timezone', () => {
  const previous = process.env.TZ;
  try {
    for (const timezone of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles']) {
      process.env.TZ = timezone;
      const { load } = fixture('2026-11-11T04:59:59Z');
      assert.equal(load('lib/capsuleDates.ts').capsuleDateOnly(), '2026-11-10');
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

for (const [deadline, unlock, boundary] of [
  ['2026-03-08', '2026-03-09', '2026-03-09T04:00:00Z'],
  ['2026-11-01', '2026-11-02', '2026-11-02T05:00:00Z'],
]) {
  test(`DST handler boundary after ${deadline}`, async () => {
    const f = fixture(boundary);
    f.clock.now -= 1;
    f.capsule.submission_deadline = deadline;
    f.capsule.unlock_date = unlock;
    const status = f.load('app/api/capsules/[id]/route.ts');
    const owner = f.load('app/api/capsules/[id]/owner/route.ts');
    assert.equal((await (await status.GET(request({}), context)).json()).capsule.submissionsOpen, true);
    assert.equal((await owner.GET(request({}), context)).status, 403);
    f.clock.now += 1;
    assert.equal((await (await status.GET(request({}), context)).json()).capsule.submissionsOpen, false);
    assert.equal((await (await owner.GET(request({}), context)).json()).unlocked, true);
  });
}

test('public status, media uploads, submissions, and recipient access agree around midnight', async () => {
  const f = fixture('2026-11-11T04:59:59.999Z');
  const status = f.load('app/api/capsules/[id]/route.ts');
  const upload = f.load('app/api/capsules/[id]/upload-targets/route.ts');
  const submit = f.load('app/api/capsules/[id]/memories/route.ts');
  const owner = f.load('app/api/capsules/[id]/owner/route.ts');
  const uploadBody = { memoryId: 'new-memory', files: [{ name: 'photo.jpg', type: 'image/jpeg', size: 10 }] };
  const memoryBody = { memoryId: '6a9fbfc2-48e7-4d80-8753-a210cacdd00d', contributorName: 'Today', title: 'New', message: 'Late night', mediaUrls: [] };
  assert.equal((await (await status.GET(request({}), context)).json()).capsule.submissionsOpen, true);
  assert.equal((await upload.POST(request(uploadBody), context)).status, 200);
  assert.equal((await submit.POST(request(memoryBody), context)).status, 201);
  assert.equal((await owner.GET(request({}), context)).status, 403);
  f.clock.now += 1;
  assert.equal((await (await status.GET(request({}), context)).json()).capsule.submissionsOpen, false);
  assert.equal((await upload.POST(request(uploadBody), context)).status, 403);
  assert.equal((await submit.POST(request(memoryBody), context)).status, 403);
  const opened = await (await owner.GET(request({}), context)).json();
  assert.equal(opened.unlocked, true);
  assert.equal(opened.memories.length, 2);
  assert.equal(opened.memories[0].mediaUrls[0], 'signed:existing-photo');
  assert.equal(opened.memories[1].message, 'Late night');
  f.setUser({ id: 'stranger', email: 'other@example.test', email_confirmed_at: '2026-01-01' });
  assert.equal((await owner.GET(request({}), context)).status, 403);
  f.setUser({ id: 'emma', email: 'emma@example.test', email_confirmed_at: null });
  assert.equal((await owner.GET(request({}), context)).status, 403);
});

test('capsule creation accepts an Eastern date even after UTC rolls over', async () => {
  const f = fixture('2026-11-11T04:59:59Z');
  const route = f.load('app/api/capsules/route.ts');
  const response = await route.POST(request({ title: 'New', submissionDeadline: '2026-11-09', unlockDate: '2026-11-10' }));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).capsule.unlockDate, '2026-11-10');
  const invalid = await route.POST(request({ title: 'New', submissionDeadline: '2026-11-11', unlockDate: '2026-11-11' }));
  assert.equal(invalid.status, 400);
});

test('actual cron skips Emma today, sends her tomorrow, then skips her on repeat (mock delivery only)', async () => {
  const f = fixture('2026-11-11T04:59:59Z');
  const cron = f.load('app/api/cron/send-unlock-emails/route.ts');
  const run = () => cron.GET(new Request('https://example.test/api/cron/send-unlock-emails'));
  assert.equal((await run()).status, 200);
  assert.equal(f.sent.length, 0);
  f.clock.now = Date.parse('2026-11-11T14:00:00Z');
  assert.equal((await run()).status, 200);
  assert.equal(f.sent.length, 1);
  assert.equal(f.sent[0].to[0], 'emma@example.test');
  assert.equal(f.capsule.recipient_email_sent_at, '2026-11-11T14:00:00.000Z');
  assert.equal(f.capsule.owner_gift_confirmation_sent_at, '2026-11-10T14:41:00Z');
  assert.equal((await run()).status, 200);
  assert.equal(f.sent.length, 1);
});

test('standalone memories retain UTC timing', () => {
  const f = fixture('2026-11-11T01:00:00Z');
  assert.equal(f.load('lib/unlockDates.ts').hasDateArrived('2026-11-11'), true);
  assert.equal(f.load('lib/capsuleDates.ts').hasCapsuleUnlocked('2026-11-11'), false);
});

function editingFixture(instant = '2026-11-10T15:00:00Z') {
  const f = fixture(instant);
  // Existing gift delivery confirmations intentionally block editing.
  f.capsule.owner_gift_confirmation_sent_at = null;
  f.setUser({ id: 'owner', email: 'owner@example.test' });
  f.route = f.load('app/api/capsules/[id]/route.ts');
  return f;
}

test('create a capsule with future dates without modifying the selected calendar dates', async () => {
  const f = editingFixture();
  const route = f.load('app/api/capsules/route.ts');
  const response = await route.POST(request({ title: 'Future', submissionDeadline: '2027-03-13', unlockDate: '2027-03-14' }));
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.capsule.submissionDeadline, '2027-03-13');
  assert.equal(body.capsule.unlockDate, '2027-03-14');
  assert.equal(f.sent.length, 0);
});

test('owner can edit both dates, or either date alone, and only date columns change', async () => {
  const f = editingFixture();
  const original = { ...f.capsule };
  const response = await f.route.PATCH(request({ submissionDeadline: '2026-11-12', unlockDate: '2026-11-13', expectedSubmissionDeadline: '2026-11-10', expectedUnlockDate: '2026-11-11' }), context);
  assert.equal(response.status, 200);
  assert.equal(f.capsule.submission_deadline, '2026-11-12');
  assert.equal(f.capsule.unlock_date, '2026-11-13');
  assert.deepEqual(Object.keys(f.updates[0].patch).sort(), ['submission_deadline', 'unlock_date']);
  assert.equal((await f.route.PATCH(request({ unlockDate: '2026-11-15' }), context)).status, 200);
  assert.equal((await f.route.PATCH(request({ submissionDeadline: '2026-11-14' }), context)).status, 200);
  for (const key of Object.keys(original).filter(key => !['submission_deadline', 'unlock_date'].includes(key))) assert.equal(f.capsule[key], original[key]);
  assert.equal(f.sent.length, 0);
});

test('an owner can reopen an expired submission window while the capsule remains locked', async () => {
  const f = editingFixture();
  f.capsule.submission_deadline = '2026-11-08';
  const status = f.load('app/api/capsules/[id]/route.ts');
  assert.equal((await (await status.GET(request({}), context)).json()).capsule.submissionsOpen, false);
  assert.equal((await f.route.PATCH(request({ submissionDeadline: '2026-11-10' }), context)).status, 200);
  assert.equal((await (await status.GET(request({}), context)).json()).capsule.submissionsOpen, true);
});

for (const body of [
  { submissionDeadline: '2026-11-12', unlockDate: '2026-11-12' },
  { submissionDeadline: '2026-11-13', unlockDate: '2026-11-12' },
  { submissionDeadline: '2026-02-30', unlockDate: '2026-11-12' },
  { submissionDeadline: null }, { unlockDate: 42 }, { unlockDate: '2026-11-10' },
  { recipient_email_sent_at: null, unlockDate: '2026-11-12' },
  {}, null, [],
]) {
  test(`reject invalid or non-date update ${JSON.stringify(body)}`, async () => {
    const f = editingFixture();
    assert.equal((await f.route.PATCH(request(body), context)).status, 400);
    assert.equal(f.updates.length, 0);
  });
}

for (const user of [null, { id: 'stranger' }, { id: 'emma', email: 'emma@example.test', email_confirmed_at: '2026-01-01' }]) {
  test(`reject date updates from ${user?.id || 'anonymous'}`, async () => {
    const f = editingFixture();
    f.setUser(user);
    assert.equal((await f.route.PATCH(request({ unlockDate: '2026-11-12' }), context)).status, user ? 403 : 401);
    assert.equal(f.updates.length, 0);
  });
}

for (const column of ['recipient_email_sent_at', 'capsule_unlock_email_sent_at', 'unlock_email_sent_at', 'owner_gift_confirmation_sent_at']) {
  test(`sent ${column} blocks date editing and remains unchanged`, async () => {
    const f = editingFixture();
    f.capsule[column] = '2026-11-10T14:00:00Z';
    const owner = f.load('app/api/capsules/[id]/owner/route.ts');
    const state = await (await owner.GET(request({}), context)).json();
    assert.equal(state.canEditDates, false);
    assert.match(state.dateEditBlockedReason, /already been sent/);
    assert.equal((await f.route.PATCH(request({ unlockDate: '2026-11-12' }), context)).status, 409);
    assert.equal(f.capsule[column], '2026-11-10T14:00:00Z');
    assert.equal(f.updates.length, 0);
  });
}

for (const boundary of ['2026-11-11T05:00:00Z', '2026-03-09T04:00:00Z', '2026-11-02T05:00:00Z']) {
  test(`editing locks at Eastern midnight ${boundary}`, async () => {
    const f = editingFixture(boundary);
    f.capsule.unlock_date = f.load('lib/capsuleDates.ts').capsuleDateOnly();
    f.capsule.submission_deadline = '2026-01-01';
    f.clock.now -= 1;
    const owner = f.load('app/api/capsules/[id]/owner/route.ts');
    assert.equal((await (await owner.GET(request({}), context)).json()).canEditDates, true);
    f.clock.now += 1;
    assert.equal((await (await owner.GET(request({}), context)).json()).canEditDates, false);
    assert.equal((await f.route.PATCH(request({ unlockDate: '2027-01-01' }), context)).status, 409);
    assert.equal(f.updates.length, 0);
  });
}

test('already unlocked legacy capsules remain readable and cannot have dates edited', async () => {
  const f = editingFixture('2026-11-15T15:00:00Z');
  f.capsule.is_gift = false;
  delete f.capsule.recipient_email_sent_at;
  delete f.capsule.owner_gift_confirmation_sent_at;
  const owner = f.load('app/api/capsules/[id]/owner/route.ts');
  const body = await (await owner.GET(request({}), context)).json();
  assert.equal(body.unlocked, true);
  assert.equal(body.memories.length, 1);
  assert.equal(body.canEditDates, false);
  assert.equal((await f.route.PATCH(request({ unlockDate: '2026-11-20' }), context)).status, 409);
});

test('reject stale forms and concurrent changes without overwriting newer dates', async () => {
  const f = editingFixture();
  assert.equal((await f.route.PATCH(request({ unlockDate: '2026-11-14', expectedUnlockDate: '2026-11-09' }), context)).status, 409);
  f.setBeforeUpdate(() => { f.capsule.unlock_date = '2026-11-12'; });
  assert.equal((await f.route.PATCH(request({ unlockDate: '2026-11-14' }), context)).status, 409);
  assert.equal(f.capsule.unlock_date, '2026-11-12');
});

test('recent or concurrent email claims block editing; stale failed attempts allow retry', async () => {
  const f = editingFixture();
  f.capsule.unlock_email_attempted_at = new Date(f.clock.now - 10 * 60 * 1000).toISOString();
  assert.equal((await f.route.PATCH(request({ unlockDate: '2026-11-12' }), context)).status, 409);
  f.capsule.unlock_email_attempted_at = new Date(f.clock.now - 16 * 60 * 1000).toISOString();
  assert.equal((await f.route.PATCH(request({ unlockDate: '2026-11-12' }), context)).status, 200);
  f.setBeforeUpdate(() => { f.capsule.recipient_email_sent_at = new Date(f.clock.now).toISOString(); });
  assert.equal((await f.route.PATCH(request({ unlockDate: '2026-11-14' }), context)).status, 409);
  assert.equal(f.capsule.unlock_date, '2026-11-12');
});

test('database midnight guard errors and database failures return safe errors', async () => {
  const f = editingFixture('2026-11-11T04:59:59.999Z');
  f.setUpdateError({ code: 'P0001', message: 'Capsule dates cannot change after unlock.' });
  assert.equal((await f.route.PATCH(request({ unlockDate: '2026-11-12' }), context)).status, 409);
  f.setUpdateError({ code: 'XX000', message: 'internal database details' });
  const failed = await f.route.PATCH(request({ unlockDate: '2026-11-12' }), context);
  assert.equal(failed.status, 500);
  assert.doesNotMatch(await failed.text(), /internal database/);
});

test('scheduled email and access use the edited unlock date, with no emails at save time', async () => {
  const f = editingFixture();
  assert.equal((await f.route.PATCH(request({ submissionDeadline: '2026-11-12', unlockDate: '2026-11-13' }), context)).status, 200);
  assert.equal(f.sent.length, 0);
  assert.equal(f.capsule.recipient_email_sent_at, null);
  const cron = f.load('app/api/cron/send-unlock-emails/route.ts');
  const run = () => cron.GET(new Request('https://example.test/api/cron/send-unlock-emails'));
  f.clock.now = Date.parse('2026-11-11T14:00:00Z');
  await run();
  assert.equal(f.sent.length, 0);
  f.setUser({ id: 'emma', email: 'emma@example.test', email_confirmed_at: '2026-01-01' });
  const owner = f.load('app/api/capsules/[id]/owner/route.ts');
  assert.equal((await owner.GET(request({}), context)).status, 403);
  f.clock.now = Date.parse('2026-11-13T14:00:00Z');
  await run();
  assert.equal(f.sent.filter(email => email.to[0] === 'emma@example.test').length, 1);
  assert.equal((await (await owner.GET(request({}), context)).json()).memories.length, 1);
  await run();
  assert.equal(f.sent.filter(email => email.to[0] === 'emma@example.test').length, 1);
});

for (const gift of [true, false]) {
  test(`cron discards a stale ${gift ? 'gift' : 'regular'} candidate if dates change before claiming`, async () => {
    const f = editingFixture('2026-11-11T14:00:00Z');
    f.capsule.is_gift = gift;
    f.setBeforeUpdate((_table, patch) => {
      if (patch.unlock_email_attempted_at) f.capsule.unlock_date = '2026-11-15';
    });
    await f.load('app/api/cron/send-unlock-emails/route.ts').GET(new Request('https://example.test/api/cron/send-unlock-emails'));
    assert.equal(f.sent.length, 0);
    assert.equal(f.capsule.unlock_email_attempted_at, null);
  });
}

// Exercise the editor's actual event handlers and rendered state without a DOM.
function editorFixture() {
  const f = editingFixture();
  const state = [];
  let index = 0;
  f.mockModule('react', {
    useState(initial) {
      const position = index++;
      if (!(position in state)) state[position] = initial;
      return [state[position], next => { state[position] = typeof next === 'function' ? next(state[position]) : next; }];
    },
  });
  f.mockModule('@/lib/supabaseClient', { getSupabaseClient: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'test-token' } } }) } }) });
  f.setFetch((url, options) => {
    assert.equal(url, '/api/capsules/emma-capsule');
    assert.equal(options.method, 'PATCH');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    return f.route.PATCH(new Request(`https://example.test${url}`, options), context);
  });
  let refreshed = 0;
  const props = {
    shareSlug: 'emma-capsule', submissionDeadline: '2026-11-10', unlockDate: '2026-11-11',
    canEdit: true, blockedReason: null,
    onSaved: async () => { refreshed++; },
  };
  const Component = f.load('components/CapsuleDateEditor.tsx').default;
  const render = () => { index = 0; return Component(props); };
  return { ...f, props, render, refreshed: () => refreshed };
}

function elements(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(elements);
  return [tree, ...elements(tree.props?.children)];
}
function textContent(tree) {
  if (Array.isArray(tree)) return tree.map(textContent).join('');
  if (tree && typeof tree === 'object') return textContent(tree.props?.children);
  return typeof tree === 'string' || typeof tree === 'number' ? String(tree) : '';
}

test('date editor shows current dates, saves, confirms, and refreshes capsule details', async () => {
  const f = editorFixture();
  let tree = f.render();
  assert.match(textContent(tree), /11:59 PM Eastern/);
  assert.match(textContent(tree), /midnight Eastern/);
  elements(tree).find(e => e.type === 'button' && textContent(e) === 'Edit dates').props.onClick();
  tree = f.render();
  const inputs = elements(tree).filter(e => e.type === 'input');
  assert.equal(inputs[0].props.value, '2026-11-10');
  assert.equal(inputs[1].props.value, '2026-11-11');
  inputs[0].props.onChange({ target: { value: '2026-11-12' } });
  inputs[1].props.onChange({ target: { value: '2026-11-13' } });
  tree = f.render();
  await elements(tree).find(e => e.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.match(textContent(f.render()), /Dates updated/);
  assert.equal(f.refreshed(), 1);
  assert.equal(f.capsule.unlock_date, '2026-11-13');
});

test('date editor reports invalid order and server unlock rejection without saving', async () => {
  const f = editorFixture();
  elements(f.render()).find(e => e.type === 'button').props.onClick();
  let tree = f.render();
  elements(tree).filter(e => e.type === 'input')[0].props.onChange({ target: { value: '2026-11-12' } });
  await elements(f.render()).find(e => e.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.match(textContent(f.render()), /Submission deadline must be before/);
  elements(f.render()).filter(e => e.type === 'input')[0].props.onChange({ target: { value: '2026-11-10' } });
  f.clock.now = Date.parse('2026-11-11T05:00:00Z');
  await elements(f.render()).find(e => e.type === 'form').props.onSubmit({ preventDefault() {} });
  tree = f.render();
  assert.match(textContent(tree), /Dates cannot be changed after this capsule has unlocked/);
  assert.ok(elements(tree).some(e => e.props?.role === 'alert'));
  assert.equal(f.updates.length, 0);
});

test('locked date editor omits the action and explains why edits are blocked', () => {
  const f = editorFixture();
  f.props.canEdit = false;
  f.props.blockedReason = 'A notification has already been sent.';
  assert.equal(elements(f.render()).filter(e => e.type === 'button').length, 0);
  assert.match(textContent(f.render()), /notification has already been sent/);
});
