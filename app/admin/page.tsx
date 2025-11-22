'use client';

import { useState } from 'react';
import ContentForm from './ContentForm';
import AdminContentList from './AdminContentList';

interface ContentItem {
  id: string;
  title: string;
  url?: string;
  description?: string;
  type: string;
  annotations?: string;
  insights?: string;
  sourceId?: string;
  tags: Array<{
    tag: {
      id: string;
      name: string;
      color?: string;
    };
  }>;
}

export default function AdminPage() {
  const [editingItem, setEditingItem] = useState<ContentItem | undefined>();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSuccess = () => {
    setEditingItem(undefined);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCancel = () => {
    setEditingItem(undefined);
  };

  const handleEdit = (item: ContentItem) => {
    setEditingItem(item);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Add and manage your content collection
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/admin/test-ingest"
                className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 font-medium text-sm"
              >
                🧪 Test Newsletter Parser
              </a>
              <a
                href="/admin/ingest"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                📥 Review Ingested Content
              </a>
              <a
                href="/"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                ← Back to Public View
              </a>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingItem ? '✏️ Edit Content' : '➕ Add New Content'}
              </h2>
              <ContentForm
                onSuccess={handleSuccess}
                editingItem={editingItem}
                onCancel={handleCancel}
              />
            </div>
          </div>

          {/* Right Column - Content List */}
          <div>
            <AdminContentList
              onEdit={handleEdit}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
