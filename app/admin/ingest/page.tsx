'use client';

import { useState, useEffect } from 'react';

interface IngestedItem {
  id: string;
  title: string;
  url?: string;
  description?: string;
  type: string;
  suggestedTags?: string;
  confidence?: number;
  status: string;
}

interface IngestionJob {
  id: string;
  fromEmail: string;
  subject?: string;
  parserType: string;
  status: string;
  createdAt: string;
  processedAt?: string;
  errorMessage?: string;
  items: IngestedItem[];
}

export default function IngestPage() {
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sources, setSources] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSource, setSelectedSource] = useState<string>('');

  useEffect(() => {
    fetchJobs();
    fetchSources();
  }, []);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ingest');
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSources = async () => {
    try {
      const response = await fetch('/api/sources');
      const data = await response.json();
      setSources(data);
    } catch (error) {
      console.error('Error fetching sources:', error);
    }
  };

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const newSelected = new Set(selectedItems);
    const pendingItems = job.items.filter(item => item.status === 'PENDING');

    pendingItems.forEach(item => newSelected.add(item.id));
    setSelectedItems(newSelected);
  };

  const handleApprove = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const itemsToApprove = Array.from(selectedItems).filter(id =>
      job.items.some(item => item.id === id && item.status === 'PENDING')
    );

    if (itemsToApprove.length === 0) {
      alert('No items selected!');
      return;
    }

    try {
      const response = await fetch(`/api/ingest/${jobId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: itemsToApprove,
          sourceId: selectedSource || undefined
        })
      });

      if (!response.ok) throw new Error('Failed to approve items');

      alert(`Approved ${itemsToApprove.length} items!`);
      setSelectedItems(new Set());
      fetchJobs();
    } catch (error) {
      console.error('Error approving items:', error);
      alert('Failed to approve items');
    }
  };

  const handleReject = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const itemsToReject = Array.from(selectedItems).filter(id =>
      job.items.some(item => item.id === id && item.status === 'PENDING')
    );

    if (itemsToReject.length === 0) {
      alert('No items selected!');
      return;
    }

    try {
      const response = await fetch(`/api/ingest/${jobId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: itemsToReject })
      });

      if (!response.ok) throw new Error('Failed to reject items');

      alert(`Rejected ${itemsToReject.length} items`);
      setSelectedItems(new Set());
      fetchJobs();
    } catch (error) {
      console.error('Error rejecting items:', error);
      alert('Failed to reject items');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      PROCESSING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      FAILED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      APPROVED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      ADDED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      REJECTED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };
    return colors[status] || colors.PENDING;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      ARTICLE: 'bg-blue-100 text-blue-800',
      VIDEO: 'bg-red-100 text-red-800',
      PODCAST: 'bg-purple-100 text-purple-800',
      TWEET: 'bg-cyan-100 text-cyan-800',
      NEWSLETTER: 'bg-yellow-100 text-yellow-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">📥 Content Ingestion</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Review and approve content extracted from emails
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

        {jobs.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 mb-4">No ingestion jobs yet</p>
            <p className="text-sm text-gray-400">
              Forward an email to start, or see documentation for setup
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {jobs.map((job) => {
              const pendingItems = job.items.filter(item => item.status === 'PENDING');
              const jobSelectedCount = job.items.filter(item => selectedItems.has(item.id)).length;

              return (
                <div
                  key={job.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700"
                >
                  {/* Job Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                          {job.subject || 'No Subject'}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                          <span>From: {job.fromEmail}</span>
                          <span>•</span>
                          <span>Parser: {job.parserType}</span>
                          <span>•</span>
                          <span>{new Date(job.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>

                    {job.errorMessage && (
                      <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
                        Error: {job.errorMessage}
                      </div>
                    )}

                    {pendingItems.length > 0 && (
                      <div className="mt-4 flex items-center gap-3">
                        <button
                          onClick={() => selectAll(job.id)}
                          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        >
                          Select All ({pendingItems.length})
                        </button>
                        {jobSelectedCount > 0 && (
                          <>
                            <span className="text-sm text-gray-500">
                              {jobSelectedCount} selected
                            </span>
                            <select
                              value={selectedSource}
                              onChange={(e) => setSelectedSource(e.target.value)}
                              className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                            >
                              <option value="">No source</option>
                              {sources.map(source => (
                                <option key={source.id} value={source.id}>
                                  {source.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleApprove(job.id)}
                              className="px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                            >
                              Approve {jobSelectedCount}
                            </button>
                            <button
                              onClick={() => handleReject(job.id)}
                              className="px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                            >
                              Reject {jobSelectedCount}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {job.items.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 ${
                          item.status !== 'PENDING'
                            ? 'opacity-50'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {item.status === 'PENDING' && (
                            <input
                              type="checkbox"
                              checked={selectedItems.has(item.id)}
                              onChange={() => toggleItem(item.id)}
                              className="mt-1"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h4 className="font-medium text-base">{item.title}</h4>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(item.type)}`}>
                                  {item.type}
                                </span>
                                {item.confidence !== null && item.confidence !== undefined && (
                                  <span className="text-xs text-gray-500">
                                    {Math.round(item.confidence * 100)}%
                                  </span>
                                )}
                                <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(item.status)}`}>
                                  {item.status}
                                </span>
                              </div>
                            </div>
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline dark:text-blue-400 block mb-1 truncate"
                              >
                                {item.url}
                              </a>
                            )}
                            {item.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {item.description}
                              </p>
                            )}
                            {item.suggestedTags && (
                              <div className="flex gap-1 mt-2">
                                {JSON.parse(item.suggestedTags).map((tag: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
