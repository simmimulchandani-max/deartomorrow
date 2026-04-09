'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

type Memory = {
  id: string;
  title: string;
};

export default function Timeline() {
  const [memories, setMemories] = useState<Memory[]>([]);

  useEffect(() => {
    async function fetchMemories() {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('memories')
        .select('*');

      if (error) {
        console.error(error);
        return;
      }

      setMemories((data as Memory[]) || []);
    }

    fetchMemories();
  }, []);

  return (
    <div>
      {memories.map((m) => (
        <div key={m.id}>{m.title}</div>
      ))}
    </div>
  );
}