import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type Capsule = {
  id: string;
  title: string;
  unlockDate: string;
  createdAt: string;
};

export type Memory = {
  capsuleId: string;
  message: string;
  name: string;
  createdAt: string;
};

export type TimelineMemory = {
  id: string;
  title: string;
  message: string;
  unlockDate: string;
  media: Array<{
    name: string;
    type: string;
    size: number;
  }>;
  createdAt: string;
};

type StoreData = {
  capsules: Capsule[];
  memories: Memory[];
  timelineMemories: TimelineMemory[];
};

const storePath = path.join(process.cwd(), "data", "store.json");

const initialStore: StoreData = {
  capsules: [],
  memories: [],
  timelineMemories: [],
};

let writeQueue = Promise.resolve();

async function ensureStoreFile() {
  await mkdir(path.dirname(storePath), { recursive: true });

  try {
    await readFile(storePath, "utf8");
  } catch {
    await writeFile(storePath, JSON.stringify(initialStore, null, 2), "utf8");
  }
}

async function readStore(): Promise<StoreData> {
  await ensureStoreFile();

  const content = await readFile(storePath, "utf8");

  try {
    const parsed = JSON.parse(content) as Partial<StoreData>;

    return {
      capsules: Array.isArray(parsed.capsules) ? parsed.capsules : [],
      memories: Array.isArray(parsed.memories) ? parsed.memories : [],
      timelineMemories: Array.isArray(parsed.timelineMemories)
        ? parsed.timelineMemories
        : [],
    };
  } catch {
    return initialStore;
  }
}

async function writeStore(data: StoreData) {
  await ensureStoreFile();
  await writeFile(storePath, JSON.stringify(data, null, 2), "utf8");
}

async function updateStore<T>(updater: (store: StoreData) => T | Promise<T>) {
  const run = async () => {
    const store = await readStore();
    const result = await updater(store);
    await writeStore(store);
    return result;
  };

  const next = writeQueue.then(run, run);
  writeQueue = next.then(
    () => undefined,
    () => undefined
  );

  return next;
}

export async function createCapsule(input: Omit<Capsule, "createdAt">) {
  const capsule: Capsule = {
    ...input,
    createdAt: new Date().toISOString(),
  };

  await updateStore((store) => {
    store.capsules.unshift(capsule);
  });

  return capsule;
}

export async function getCapsuleById(id: string) {
  const store = await readStore();
  return store.capsules.find((capsule) => capsule.id === id) ?? null;
}

export async function listCapsules() {
  const store = await readStore();
  return [...store.capsules];
}
export async function deleteTimelineMemory(id: string) {
  await updateStore((store) => {
    store.timelineMemories = store.timelineMemories.filter((memory) => memory.id !== id);
  });
}
export async function addMemory(
  input: Omit<Memory, "createdAt"> & {
    createdAt?: string;
  }
) {
  const memory: Memory = {
    ...input,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };

  await updateStore((store) => {
    store.memories.push(memory);
  });

  return memory;
}

export async function getMemoriesByCapsuleId(capsuleId: string) {
  const store = await readStore();

  return store.memories
    .filter((memory) => memory.capsuleId === capsuleId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function createTimelineMemory(
  input: Omit<TimelineMemory, "createdAt">
) {
  const memory: TimelineMemory = {
    ...input,
    createdAt: new Date().toISOString(),
  };

  await updateStore((store) => {
    store.timelineMemories.unshift(memory);
  });

  return memory;
}

export async function listTimelineMemories() {
  const store = await readStore();
  return [...store.timelineMemories];
}
