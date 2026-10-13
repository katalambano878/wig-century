'use client';

import Link from 'next/link';

export default function AdminBlogNewPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/blog" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
          Back to journal
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-3">New journal article</h1>
        <p className="text-gray-600 mt-1">Published articles live on the journal.</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <Link
          href="/blog"
          target="_blank"
          className="inline-flex items-center px-5 py-3 bg-slate-800 text-white rounded-lg font-semibold"
        >
          Open the journal
        </Link>
      </div>
    </div>
  );
}
