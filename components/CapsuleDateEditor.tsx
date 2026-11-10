'use client';

import { useState, type FormEvent } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';

type Props = {
  shareSlug: string;
  submissionDeadline: string;
  unlockDate: string;
  canEdit: boolean;
  blockedReason: string | null;
  onSaved: () => Promise<void>;
};

export default function CapsuleDateEditor(props: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deadline, setDeadline] = useState(props.submissionDeadline);
  const [unlock, setUnlock] = useState(props.unlockDate);
  const [originalDates, setOriginalDates] = useState({
    submissionDeadline: props.submissionDeadline, unlockDate: props.unlockDate,
  });
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState('');

  function startEditing() {
    setDeadline(props.submissionDeadline);
    setUnlock(props.unlockDate);
    setOriginalDates({ submissionDeadline: props.submissionDeadline, unlockDate: props.unlockDate });
    setError('');
    setConfirmation('');
    setEditing(true);
  }

  async function saveDates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setConfirmation('');
    if (!deadline || !unlock || deadline >= unlock) {
      setError('Submission deadline must be before the unlock date.');
      return;
    }
    setSaving(true);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) throw new Error('Please log in as the capsule owner.');
      const response = await fetch(`/api/capsules/${props.shareSlug}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionDeadline: deadline, unlockDate: unlock,
          expectedSubmissionDeadline: originalDates.submissionDeadline,
          expectedUnlockDate: originalDates.unlockDate,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save dates. Please try again.');
      setEditing(false);
      setConfirmation('Dates updated.');
      try {
        await props.onSaved();
      } catch {
        setError('Dates were saved, but the details could not refresh. Please reload this page.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to save dates. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-8 rounded-[1.75rem] border border-white/70 bg-gray-100 p-6 shadow-sm">
      <p className="text-sm text-gray-600">Submissions close at 11:59 PM Eastern on the deadline, including the final second of the day.</p>
      <p className="mt-1 text-sm text-gray-600">Capsules unlock at midnight Eastern at the start of the unlock date. Daylight saving time is handled automatically.</p>
      {!props.canEdit ? (
        <p className="mt-3 text-sm text-gray-600">{props.blockedReason || 'Dates cannot be edited.'}</p>
      ) : editing ? (
        <form onSubmit={saveDates} className="mt-5 space-y-4" aria-label="Edit capsule dates">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-[#4a3c31]">
              Submission deadline
              <input type="date" required value={deadline} disabled={saving}
                onChange={event => setDeadline(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-gray-300 bg-white p-3" />
            </label>
            <label className="block text-sm font-semibold text-[#4a3c31]">
              Unlock date
              <input type="date" required value={unlock} disabled={saving}
                onChange={event => setUnlock(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-gray-300 bg-white p-3" />
            </label>
          </div>
          <p className="text-sm text-gray-600">Choose an unlock date after today in Eastern time. Dates can be changed until the capsule unlocks, provided no unlock notification or gift delivery confirmation has been sent.</p>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="rounded-full bg-[#f7c7b6] px-5 py-3 text-sm font-semibold text-[#4a3c31] disabled:opacity-60">
              {saving ? 'Saving...' : 'Save dates'}
            </button>
            <button type="button" disabled={saving} onClick={() => { setEditing(false); setError(''); }} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#4a3c31] disabled:opacity-60">Cancel</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={startEditing} disabled={saving} className="mt-4 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#4a3c31] disabled:opacity-60">Edit dates</button>
      )}
      {confirmation ? <p role="status" className="mt-3 text-sm font-medium text-green-800">{confirmation}</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
    </div>
  );
}
