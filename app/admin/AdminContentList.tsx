'use client';

import { useState, useEffect } from 'react';

interface Tag {
  id: string;
  name: string;
  color?: string;
}

interface Source {
  id: string;
  name: string;
}

interface ContentItem {
  id: string;
  title: string;
  url?: string;
  description?: string;
  type: string;
  annotations?: string;
  insights?: string;
  createdAt: string;
  sourceId?: string;
  source?: Source;
  tags: Array<{
    tag: Tag;
  }>;
}

export default function AdminContentList({
  onEdit,
  refreshTrigger
}: {
  onEdit: (item: ContentItem) => void;
  refreshTrigger?: number;
}) {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [unprocessedContent, setUnprocessedContent] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUnprocessed, setShowUnprocessed] = useState(true);

  useEffect(() => {
    fetchContent();
  }, [refreshTrigger]);

  const fetchContent = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/content');
      const data = await response.json();
      setContent(data);

      // Filter unprocessed items (no annotations, insights, or tags)
      const unprocessed = data.filter(
        (item: ContentItem) =>
          (!item.annotations || item.annotations.trim() === '') &&
          (!item.insights || item.insights.trim() === '') &&
          item.tags.length === 0
      );
      setUnprocessedContent(unprocessed);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/content/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      alert('Content deleted successfully!');
      fetchContent();
    } catch (error) {
      console.error('Error deleting content:', error);
      alert('Failed to delete content. Please try again.');
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      ARTICLE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      VIDEO: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      PODCAST: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      BOOK: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      TWEET: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      NEWSLETTER: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      OTHER: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };
    return colors[type] || colors.OTHER;
  };

  const ContentItemRow = ({ item }: { item: ContentItem }) => (
    <div className="border-b border-gray-200 dark:border-gray-700 py-4 last:border-b-0">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-lg truncate mb-1">{item.title}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(item.type)}`}>
              {item.type.charAt(0) + item.type.slice(1).toLowerCase()}
            </span>
            {item.source && <span>• {item.source.name}</span>}
            <span>• {new Date(item.createdAt).toLocaleDateString()}</span>
          </div>
          {item.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
              {item.description}
            </p>
          )}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {item.tags.map(({ tag }) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 rounded-full text-xs text-white"
                  style={{ backgroundColor: tag.color || '#3b82f6' }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          {(item.annotations || item.insights) && (
            <div className="flex gap-2 text-xs">
              {item.annotations && (
                <span className="text-yellow-700 dark:text-yellow-400">📝 Has notes</span>
              )}
              {item.insights && (
                <span className="text-green-700 dark:text-green-400">💡 Has insights</span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => onEdit(item)}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(item.id, item.title)}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading content...</div>;
  }

  return (
    <div className="space-y-6">
      {/* To Process Queue */}
      {unprocessedContent.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-2xl">⏳</span>
              To Process
              <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                ({unprocessedContent.length} {unprocessedContent.length === 1 ? 'item' : 'items'} without annotations or tags)
              </span>
            </h3>
            <button
              onClick={() => setShowUnprocessed(!showUnprocessed)}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              {showUnprocessed ? 'Hide' : 'Show'}
            </button>
          </div>
          {showUnprocessed && (
            <div className="space-y-2">
              {unprocessedContent.map((item) => (
                <ContentItemRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold mb-4">
          All Content ({content.length} {content.length === 1 ? 'item' : 'items'})
        </h3>
        {content.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No content yet. Add your first item above!
          </p>
        ) : (
          <div>
            {content.map((item) => (
              <ContentItemRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
