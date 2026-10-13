'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function AdminBlogEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/blog" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
          Back to journal
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-3">Journal article</h1>
        <p className="text-gray-600 mt-1">Article {id}</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <p className="text-gray-700">
          This article is part of the Wig Century journal. Open it on the site to read the published page.
        </p>
        <Link
          href={`/blog/${id}`}
          target="_blank"
          className="inline-flex items-center px-5 py-3 bg-slate-800 text-white rounded-lg font-semibold"
        >
          View on site
        </Link>
      </div>
    </div>
  );
}
