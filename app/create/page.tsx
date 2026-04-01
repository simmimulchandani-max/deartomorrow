'use client';

import { useState, useRef } from 'react';

export default function CreateMemoryPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('message', message);
      formData.append('unlockDate', unlockDate);
      if (fileInputRef.current?.files) {
        Array.from(fileInputRef.current.files).forEach((file) => {
          formData.append('media', file);
        });
      }

      const res = await fetch('/api/memories', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Failed to create memory');

      setTitle('');
      setMessage('');
      setUnlockDate('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      alert('Memory created!');
    } catch (err) {
      console.error(err);
      alert('Error creating memory');
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-[#F5F0E6] flex flex-col items-center p-6">
      {/* Top Section */}
      <div className="w-full max-w-4xl flex justify-between items-start mb-8">
        <div className="space-y-2">
          <span className="text-sm font-semibold text-gray-500">CREATE MEMORY</span>
          <h1 className="text-4xl font-bold leading-tight">Start a memory for tomorrow.</h1>
          <p className="text-gray-600 max-w-md">
            Fill in the details below to create a memory that you can revisit later. Add photos, videos, and a message to keep it special.
          </p>
        </div>

        {/* Right-side Pill Buttons */}
        <div className="flex space-x-3">
          <button className="px-4 py-2 rounded-full bg-white border border-gray-300 shadow text-gray-700 hover:bg-gray-100">
            Home
          </button>
          <button className="px-4 py-2 rounded-full bg-white border border-gray-300 shadow text-gray-700 hover:bg-gray-100">
            Timeline
          </button>
        </div>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-3xl bg-gray-100 rounded-3xl p-10 space-y-6 shadow">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* TITLE */}
          <div>
            <label className="block mb-2 font-medium text-gray-700">TITLE</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-4 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>

          {/* MESSAGE */}
          <div>
            <label className="block mb-2 font-medium text-gray-700">MESSAGE</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-4 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 h-32"
            />
          </div>

          {/* PHOTOS OR VIDEOS */}
          <div>
            <label className="block mb-2 font-medium text-gray-700">PHOTOS OR VIDEOS</label>
            <div
              className="w-full border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400"
              onClick={handleFileClick}
            >
              <p className="text-gray-500">Upload photos or videos</p>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                ref={fileInputRef}
                className="hidden"
              />
            </div>
          </div>

          {/* UNLOCK DATE */}
          <div>
            <label className="block mb-2 font-medium text-gray-700">UNLOCK DATE</label>
            <input
              type="date"
              value={unlockDate}
              onChange={(e) => setUnlockDate(e.target.value)}
              className="w-full p-4 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[#f7c7b6] px-8 text-base font-semibold text-[#4a3c31] transition hover:bg-[#f4bba8] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Creating...' : 'Create Memory'}
          </button>
        </form>
      </div>
    </div>
  );
}