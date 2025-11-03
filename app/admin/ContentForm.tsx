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

export default function ContentForm({ onSuccess }: { onSuccess?: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [showTagForm, setShowTagForm] = useState(false);
  const [showSourceForm, setShowSourceForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    type: 'ARTICLE',
    annotations: '',
    insights: '',
    sourceId: '',
    tagIds: [] as string[]
  });

  // New tag/source state
  const [newTag, setNewTag] = useState({ name: '', color: '#3b82f6' });
  const [newSource, setNewSource] = useState({ name: '', url: '', type: 'WEBSITE' });

  // Fetch tags and sources on component mount
  useEffect(() => {
    fetchTags();
    fetchSources();
  }, []);

  const fetchTags = async () => {
    const response = await fetch('/api/tags');
    const data = await response.json();
    setTags(data);
  };

  const fetchSources = async () => {
    const response = await fetch('/api/sources');
    const data = await response.json();
    setSources(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create content');
      }

      // Reset form
      setFormData({
        title: '',
        url: '',
        description: '',
        type: 'ARTICLE',
        annotations: '',
        insights: '',
        sourceId: '',
        tagIds: []
      });

      if (onSuccess) {
        onSuccess();
      }

      alert('Content added successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to add content. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTag = async () => {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTag)
      });

      if (!response.ok) throw new Error('Failed to create tag');

      setNewTag({ name: '', color: '#3b82f6' });
      setShowTagForm(false);
      fetchTags();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create tag');
    }
  };

  const handleCreateSource = async () => {
    try {
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSource)
      });

      if (!response.ok) throw new Error('Failed to create source');

      setNewSource({ name: '', url: '', type: 'WEBSITE' });
      setShowSourceForm(false);
      fetchSources();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create source');
    }
  };

  const toggleTag = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-2">
          Title *
        </label>
        <input
          id="title"
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
          placeholder="Enter the title of the content"
        />
      </div>

      {/* URL */}
      <div>
        <label htmlFor="url" className="block text-sm font-medium mb-2">
          URL
        </label>
        <input
          id="url"
          type="url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
          placeholder="https://..."
        />
      </div>

      {/* Type */}
      <div>
        <label htmlFor="type" className="block text-sm font-medium mb-2">
          Type *
        </label>
        <select
          id="type"
          required
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
        >
          <option value="ARTICLE">Article</option>
          <option value="VIDEO">Video</option>
          <option value="PODCAST">Podcast</option>
          <option value="BOOK">Book</option>
          <option value="TWEET">Tweet</option>
          <option value="NEWSLETTER">Newsletter</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-2">
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
          rows={3}
          placeholder="Brief summary of the content"
        />
      </div>

      {/* Source */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="source" className="block text-sm font-medium">
            Source
          </label>
          <button
            type="button"
            onClick={() => setShowSourceForm(!showSourceForm)}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            + New Source
          </button>
        </div>

        {showSourceForm && (
          <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md space-y-2">
            <input
              type="text"
              value={newSource.name}
              onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded dark:bg-gray-600 dark:border-gray-500"
              placeholder="Source name"
            />
            <input
              type="url"
              value={newSource.url}
              onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded dark:bg-gray-600 dark:border-gray-500"
              placeholder="Source URL (optional)"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreateSource}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowSourceForm(false)}
                className="px-3 py-1 text-sm bg-gray-300 rounded hover:bg-gray-400 dark:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <select
          id="source"
          value={formData.sourceId}
          onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
        >
          <option value="">Select a source...</option>
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium">Tags</label>
          <button
            type="button"
            onClick={() => setShowTagForm(!showTagForm)}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            + New Tag
          </button>
        </div>

        {showTagForm && (
          <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md space-y-2">
            <input
              type="text"
              value={newTag.name}
              onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded dark:bg-gray-600 dark:border-gray-500"
              placeholder="Tag name"
            />
            <div className="flex gap-2">
              <input
                type="color"
                value={newTag.color}
                onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                className="h-8 w-16"
              />
              <button
                type="button"
                onClick={handleCreateTag}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowTagForm(false)}
                className="px-3 py-1 text-sm bg-gray-300 rounded hover:bg-gray-400 dark:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                formData.tagIds.includes(tag.id)
                  ? 'text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
              style={
                formData.tagIds.includes(tag.id)
                  ? { backgroundColor: tag.color || '#3b82f6' }
                  : {}
              }
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      {/* Annotations */}
      <div>
        <label htmlFor="annotations" className="block text-sm font-medium mb-2">
          Your Notes & Annotations
        </label>
        <textarea
          id="annotations"
          value={formData.annotations}
          onChange={(e) => setFormData({ ...formData, annotations: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
          rows={4}
          placeholder="Your thoughts, key takeaways, questions..."
        />
      </div>

      {/* Insights */}
      <div>
        <label htmlFor="insights" className="block text-sm font-medium mb-2">
          Insights & Business Ideas
        </label>
        <textarea
          id="insights"
          value={formData.insights}
          onChange={(e) => setFormData({ ...formData, insights: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
          rows={4}
          placeholder="2nd/3rd order effects, potential business ideas, connections to other concepts..."
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
      >
        {isSubmitting ? 'Adding...' : 'Add Content'}
      </button>
    </form>
  );
}
