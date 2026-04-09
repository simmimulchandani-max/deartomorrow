'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import Link from 'next/link';

type Memory = {
  id: string;
  title: string;
  user_id?: string;
};

export default function Timeline() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMemories() {
      const supabase = getSupabaseClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(userError);
        setMemories([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error(error);
        setMemories([]);
        setIsLoading(false);
        return;
      }

      setMemories((data as Memory[]) || []);
      setIsLoading(false);
    }

    fetchMemories();
  }, []);

  const totalCount = memories.length;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fff8e5_0%,_#f1e3c6_46%,_#d6ebf5_100%)] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-[#4a3c31]">Timeline</h1>
            <p className="mt-2 text-sm text-[#6f6258]">
              A quiet place for the notes you leave for your future self.
            </p>
          </div>

          <Link
            href="/create"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] px-6 text-sm font-semibold tracking-[0.12em] text-[#4a3c31] transition hover:bg-[#f4bba8]"
          >
            Create a Memory
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.75rem] border border-white/70 bg-white/70 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a786d]">
              Total Memories
            </p>
            <p className="mt-3 text-4xl font-semibold text-[#4a3c31]">
              {isLoading ? '--' : totalCount}
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/70 bg-white/70 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a786d]">
              Waiting
            </p>
            <p className="mt-3 text-4xl font-semibold text-[#4a3c31]">
              {isLoading ? '--' : 0}
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/70 bg-white/70 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a786d]">
              Opened
            </p>
            <p className="mt-3 text-4xl font-semibold text-[#4a3c31]">
              {isLoading ? '--' : 0}
            </p>
          </div>
        </div>

        <div className="mt-8">
          {isLoading ? (
            <div className="rounded-[1.75rem] border border-white/70 bg-white/70 p-8 text-center shadow-sm">
              <p className="text-[#6f6258]">Loading your memories...</p>
            </div>
          ) : memories.length === 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-[1.75rem] border border-white/70 bg-white/75 p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a786d]">
                  Waiting to bloom
                </p>
                <h2 className="mt-3 text-xl font-semibold text-[#4a3c31]">
                  Your first memory will appear here
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#6f6258]">
                  Create a memory and send a little note, hope, or feeling to your future self.
                </p>
                <Link
                  href="/create"
                  className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] px-5 text-sm font-semibold text-[#4a3c31] transition hover:bg-[#f4bba8]"
                >
                  Create your first memory
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {memories.map((m) => (
                <div
                  key={m.id}
                  className="rounded-[1.75rem] border border-white/70 bg-white/75 p-6 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a786d]">
                    Memory
                  </p>
                  <h2 className="mt-3 text-xl font-semibold text-[#4a3c31]">
                    {m.title || 'Untitled Memory'}
                  </h2>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}