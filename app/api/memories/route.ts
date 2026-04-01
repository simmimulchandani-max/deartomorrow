import { NextRequest, NextResponse } from 'next/server';

// Temporary in-memory store (replace with a DB later)
let memories: Array<{
  title: string;
  content: string;
  date?: string;
  tags?: string;
  createdAt: string;
}> = [];

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // Basic validation (ensure required fields exist)
    if (!data.title || !data.content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    // Push to in-memory store
    memories.push({
      title: data.title,
      content: data.content,
      date: data.date || '',
      tags: data.tags || '',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, memory: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create memory' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(memories);
}