import ContentList from './ContentList';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Idea Map</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            A curated collection of insights from articles, videos, podcasts, and more
          </p>
        </header>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Content Collection</h2>
          <ContentList />
        </section>

        <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <a
            href="/admin"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Admin Dashboard →
          </a>
        </footer>
      </div>
    </main>
  );
}
