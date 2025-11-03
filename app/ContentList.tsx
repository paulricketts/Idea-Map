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
  url?: string;
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
  source?: Source;
  tags: Array<{
    tag: Tag;
  }>;
  connectionsFrom?: Array<{
    toItem: {
      id: string;
      title: string;
    };
  }>;
}

export default function ContentList() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchContent();
    fetchTags();
  }, [selectedTag, selectedType]);

  const fetchContent = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTag) params.append('tagId', selectedTag);
      if (selectedType) params.append('type', selectedType);

      const response = await fetch(`/api/content?${params}`);
      const data = await response.json();
      setContent(data);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      const data = await response.json();
      setTags(data);
    } catch (error) {
      console.error('Error fetching tags:', error);
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

  return (
    <div>
      {/* Filters */}
      <div className="mb-8 space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
            Filter by Type
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedType(null)}
              className={`px-3 py-1 rounded-md text-sm ${
                selectedType === null
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              All
            </button>
            {['ARTICLE', 'VIDEO', 'PODCAST', 'BOOK', 'NEWSLETTER'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1 rounded-md text-sm ${
                  selectedType === type
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {type.charAt(0) + type.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {tags.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
              Filter by Tag
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedTag === null
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                All Tags
              </button>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTag(tag.id)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedTag === tag.id ? 'text-white' : ''
                  }`}
                  style={
                    selectedTag === tag.id
                      ? { backgroundColor: tag.color || '#3b82f6' }
                      : {
                          backgroundColor:
                            'rgb(229 231 235 / var(--tw-bg-opacity))',
                        }
                  }
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content Items */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : content.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No content found. Start adding items from the{' '}
          <a href="/admin" className="text-blue-600 hover:underline">
            admin dashboard
          </a>
          .
        </div>
      ) : (
        <div className="space-y-6">
          {content.map((item) => (
            <article
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {item.title}
                      </a>
                    ) : (
                      item.title
                    )}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(item.type)}`}>
                      {item.type.charAt(0) + item.type.slice(1).toLowerCase()}
                    </span>
                    {item.source && (
                      <span>
                        from{' '}
                        {item.source.url ? (
                          <a
                            href={item.source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {item.source.name}
                          </a>
                        ) : (
                          <span className="font-medium">{item.source.name}</span>
                        )}
                      </span>
                    )}
                    <span className="text-gray-400">•</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {item.description && (
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  {item.description}
                </p>
              )}

              {item.annotations && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-3 mb-3">
                  <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-400 mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {item.annotations}
                  </p>
                </div>
              )}

              {item.insights && (
                <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 p-3 mb-3">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-400 mb-1">
                    Insights & Ideas
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {item.insights}
                  </p>
                </div>
              )}

              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {item.tags.map(({ tag }) => (
                    <span
                      key={tag.id}
                      className="px-2 py-1 rounded-full text-xs text-white"
                      style={{ backgroundColor: tag.color || '#3b82f6' }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              {item.connectionsFrom && item.connectionsFrom.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Related to:{' '}
                    {item.connectionsFrom.map((conn, idx) => (
                      <span key={conn.toItem.id}>
                        {idx > 0 && ', '}
                        <span className="font-medium">{conn.toItem.title}</span>
                      </span>
                    ))}
                  </p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
