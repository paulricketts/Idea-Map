'use client';

import { useState, useEffect, useRef } from 'react';

interface IngestedItem {
  id: string;
  title: string;
  url?: string;
  description?: string;
  type: string;
  category?: string;
  section?: string;
  authorNote?: string;
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

interface Source {
  id: string;
  name: string;
  url?: string;
  type?: string;
}

// Check if a title needs editing
function needsTitle(title: string): boolean {
  const invalidTitles = ['link', 'untitled', ''];
  return invalidTitles.includes(title.toLowerCase().trim());
}

export default function IngestPage() {
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('');
  
  // Title editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  
  // New source modal state
  const [showNewSourceModal, setShowNewSourceModal] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceType, setNewSourceType] = useState<string>('NEWSLETTER');
  const [isCreatingSource, setIsCreatingSource] = useState(false);
  
  // Collapsible job state - tracks which jobs are expanded
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  
  // Filter state - whether to hide completed/approved jobs
  const [hideCompletedJobs, setHideCompletedJobs] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchSources();
  }, []);

  // Focus input when editing starts
  useEffect(() => {
    if (editingItemId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingItemId]);

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

  // Start editing a title
  const startEditingTitle = (item: IngestedItem) => {
    setEditingItemId(item.id);
    setEditingTitle(needsTitle(item.title) ? '' : item.title);
  };

  // Save edited title
  const saveTitle = async (jobId: string, itemId: string) => {
    if (!editingTitle.trim()) {
      alert('Please enter a title');
      return;
    }

    setSavingTitle(true);
    try {
      const response = await fetch(`/api/ingest/${jobId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle.trim() })
      });

      if (!response.ok) throw new Error('Failed to save title');

      // Update local state
      setJobs(jobs.map(job => ({
        ...job,
        items: job.items.map(item =>
          item.id === itemId ? { ...item, title: editingTitle.trim() } : item
        )
      })));

      setEditingItemId(null);
      setEditingTitle('');
    } catch (error) {
      console.error('Error saving title:', error);
      alert('Failed to save title');
    } finally {
      setSavingTitle(false);
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingItemId(null);
    setEditingTitle('');
  };

  // Handle key press in edit input
  const handleEditKeyDown = (e: React.KeyboardEvent, jobId: string, itemId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTitle(jobId, itemId);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const handleCreateSource = async () => {
    if (!newSourceName.trim()) {
      alert('Please enter a source name');
      return;
    }

    setIsCreatingSource(true);
    try {
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSourceName.trim(),
          url: newSourceUrl.trim() || undefined,
          type: newSourceType
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create source');
      }

      const newSource = await response.json();
      setSources([...sources, newSource].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedSource(newSource.id);
      setShowNewSourceModal(false);
      setNewSourceName('');
      setNewSourceUrl('');
      setNewSourceType('NEWSLETTER');
    } catch (error) {
      console.error('Error creating source:', error);
      alert(error instanceof Error ? error.message : 'Failed to create source');
    } finally {
      setIsCreatingSource(false);
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

    // Check for items missing titles
    const itemsMissingTitles = job.items.filter(
      item => itemsToApprove.includes(item.id) && needsTitle(item.title)
    );

    if (itemsMissingTitles.length > 0) {
      alert(
        `Cannot approve ${itemsMissingTitles.length} item(s) without proper titles.\n\n` +
        `Please click on items marked with ⚠️ to add titles before approving.`
      );
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

  // Count items needing titles in selected set
  const getSelectedItemsNeedingTitles = (job: IngestionJob) => {
    return job.items.filter(
      item => selectedItems.has(item.id) && needsTitle(item.title)
    ).length;
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

    // Toggle a job's expanded/collapsed state
    const toggleJobExpanded = (jobId: string) => {
      const newExpanded = new Set(expandedJobs);
      if (newExpanded.has(jobId)) {
        newExpanded.delete(jobId);
      } else {
        newExpanded.add(jobId);
      }
      setExpandedJobs(newExpanded);
    };
  
    // Check if a job is "completed" (should be hidden when filter is on)
    const isJobCompleted = (job: IngestionJob) => {
      // Job is completed if its status is APPROVED
      if (job.status === 'APPROVED') return true;
      
      // Or if all items are either ADDED or REJECTED (none pending)
      if (job.items.length === 0) return false;
      return job.items.every(item => 
        item.status === 'ADDED' || item.status === 'REJECTED'
      );
    };
  
    // Expand all jobs (useful utility)
    const expandAllJobs = () => {
      setExpandedJobs(new Set(jobs.map(j => j.id)));
    };
  
    // Collapse all jobs
    const collapseAllJobs = () => {
      setExpandedJobs(new Set());
    };

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
          
          {/* Filter and view controls */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* Hide completed toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideCompletedJobs}
                onChange={(e) => setHideCompletedJobs(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Hide completed jobs
              </span>
            </label>
            
            {/* Expand/Collapse all buttons */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={expandAllJobs}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                Expand all
              </button>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <button
                onClick={collapseAllJobs}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                Collapse all
              </button>
            </div>
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
            {jobs
              .filter(job => !hideCompletedJobs || !isJobCompleted(job))
              .map((job) => {
              const pendingItems = job.items.filter(item => item.status === 'PENDING');
              const jobSelectedCount = job.items.filter(item => selectedItems.has(item.id)).length;
              const selectedNeedingTitles = getSelectedItemsNeedingTitles(job);

              return (
                <div
                  key={job.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700"
                >
                  {/* Job Header - Clickable to expand/collapse */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div 
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => toggleJobExpanded(job.id)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {/* Expand/Collapse indicator */}
                        <span className="text-gray-400 dark:text-gray-500 select-none">
                          {expandedJobs.has(job.id) ? '▼' : '▶'}
                        </span>
                        <div>
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
                      <div className="mt-4 flex flex-wrap items-center gap-3">
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
                            
                            {/* Warning if selected items need titles */}
                            {selectedNeedingTitles > 0 && (
                              <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                ⚠️ {selectedNeedingTitles} need titles
                              </span>
                            )}
                            
                            {/* Source selector with create option */}
                            <div className="flex items-center gap-2">
                              <select
                                value={selectedSource}
                                onChange={(e) => {
                                  if (e.target.value === '__new__') {
                                    setShowNewSourceModal(true);
                                  } else {
                                    setSelectedSource(e.target.value);
                                  }
                                }}
                                className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                              >
                                <option value="">No source</option>
                                {sources.map(source => (
                                  <option key={source.id} value={source.id}>
                                    {source.name}
                                  </option>
                                ))}
                                <option value="__new__">+ Create new source...</option>
                              </select>
                            </div>
                            
                            <button
                              onClick={() => handleApprove(job.id)}
                              disabled={selectedNeedingTitles > 0}
                              className={`px-4 py-1 rounded text-sm text-white ${
                                selectedNeedingTitles > 0
                                  ? 'bg-gray-400 cursor-not-allowed'
                                  : 'bg-green-600 hover:bg-green-700'
                              }`}
                              title={selectedNeedingTitles > 0 ? 'Add titles to all selected items first' : ''}
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

                  {/* Items - only shown when job is expanded */}
                  {expandedJobs.has(job.id) && (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {job.items.map((item) => {
                        const itemNeedsTitle = needsTitle(item.title);
                        const isEditing = editingItemId === item.id;

                        return (
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
                                  {/* Editable Title */}
                                  {isEditing ? (
                                    <div className="flex items-center gap-2 flex-1">
                                      <input
                                        ref={editInputRef}
                                        type="text"
                                        value={editingTitle}
                                        onChange={(e) => setEditingTitle(e.target.value)}
                                        onKeyDown={(e) => handleEditKeyDown(e, job.id, item.id)}
                                        className="flex-1 px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-blue-500"
                                        placeholder="Enter a title..."
                                        disabled={savingTitle}
                                      />
                                      <button
                                        onClick={() => saveTitle(job.id, item.id)}
                                        disabled={savingTitle}
                                        className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                                      >
                                        {savingTitle ? '...' : 'Save'}
                                      </button>
                                      <button
                                        onClick={cancelEditing}
                                        disabled={savingTitle}
                                        className="px-2 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      {itemNeedsTitle && item.status === 'PENDING' && (
                                        <span className="text-amber-500" title="Needs a title">⚠️</span>
                                      )}
                                      <h4
                                        className={`font-medium text-base ${
                                          item.status === 'PENDING'
                                            ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400'
                                            : ''
                                        } ${
                                          itemNeedsTitle
                                            ? 'text-amber-600 dark:text-amber-400 italic'
                                            : ''
                                        }`}
                                        onClick={() => item.status === 'PENDING' && startEditingTitle(item)}
                                        title={item.status === 'PENDING' ? 'Click to edit title' : ''}
                                      >
                                        {itemNeedsTitle ? '(click to add title)' : item.title}
                                      </h4>
                                      {item.status === 'PENDING' && !itemNeedsTitle && (
                                        <button
                                          onClick={() => startEditingTitle(item)}
                                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
                                          title="Edit title"
                                        >
                                          ✏️
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {item.category && (
                                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded text-xs font-medium">
                                        {item.category}
                                      </span>
                                    )}
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
                                    🔗 {item.url}
                                  </a>
                                )}
                                {item.description && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {item.description}
                                  </p>
                                )}
                                {item.authorNote && (
                                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm">
                                    <span className="font-semibold text-blue-900 dark:text-blue-300">Benedict&apos;s note:</span>
                                    <span className="text-gray-700 dark:text-gray-300 ml-2 italic">{item.authorNote}</span>
                                  </div>
                                )}
                                {item.suggestedTags && (
                                  <div className="flex flex-wrap gap-1 mt-2">
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
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create New Source Modal */}
      {showNewSourceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4">Create New Source</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  placeholder="e.g., Benedict Evans Newsletter"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">URL</label>
                <input
                  type="url"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="e.g., https://www.ben-evans.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={newSourceType}
                  onChange={(e) => setNewSourceType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                >
                  <option value="NEWSLETTER">Newsletter</option>
                  <option value="WEBSITE">Website</option>
                  <option value="PERSON">Person</option>
                  <option value="PODCAST">Podcast</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewSourceModal(false);
                  setNewSourceName('');
                  setNewSourceUrl('');
                  setNewSourceType('NEWSLETTER');
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                disabled={isCreatingSource}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSource}
                disabled={isCreatingSource || !newSourceName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingSource ? 'Creating...' : 'Create Source'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}