'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TestIngestPage() {
  const [fromEmail, setFromEmail] = useState('benedict@ben-evans.com');
  const [subject, setSubject] = useState('Benedict Evans Newsletter');
  const [html, setHtml] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          subject: subject,
          html: html
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to ingest content');
      }

      const data = await response.json();
      alert(`Success! Created job ${data.job.id} with ${data.itemCount} items`);

      // Redirect to ingest review page
      router.push('/admin/ingest');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">🧪 Test Newsletter Ingestion</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Paste newsletter HTML to test the parser
              </p>
            </div>
            <a
              href="/admin"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              ← Back to Admin
            </a>
          </div>
        </header>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                From Email
              </label>
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Newsletter HTML
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Open the newsletter in your browser, right-click → "View Page Source" or "Inspect",
                then copy the entire HTML
              </p>
              <textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 font-mono text-sm"
                rows={20}
                placeholder="<html>...</html>"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {html.length > 0 && `${html.length.toLocaleString()} characters`}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting || !html}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Processing...' : 'Process Newsletter'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setHtml('');
                  setError('');
                }}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Clear
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-3">How to get newsletter HTML:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>Open the Benedict Evans newsletter in your email client</li>
              <li>Click "View in browser" if available (easier to get clean HTML)</li>
              <li>Right-click on the page and select "View Page Source" (or press Ctrl+U / Cmd+Option+U)</li>
              <li>Copy all the HTML (Ctrl+A / Cmd+A, then Ctrl+C / Cmd+C)</li>
              <li>Paste it into the textarea above</li>
              <li>Click "Process Newsletter"</li>
            </ol>

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm">
              <strong>Note:</strong> After processing, you'll be redirected to the review page
              where you can see all extracted items with categories and Benedict's notes.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
