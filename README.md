# Idea Map - Content Curation Platform

A platform for cataloging, organizing, and making connections between articles, videos, podcasts, books, and other content about tech and AI. Built to help you extract insights, identify patterns, and generate business ideas from your content consumption.

## Features

- **Content Ingestion**: Easily add articles, videos, podcasts, books, newsletters, and more
- **Rich Metadata**: Track sources, add personal annotations, and capture insights
- **Tagging System**: Apply multiple tags to organize and categorize content
- **Filtering**: Filter content by type (article, video, podcast, etc.) and tags
- **Public Sharing**: Share your curated collection and insights publicly
- **Connections**: Link related content items to surface patterns and relationships

## Tech Stack

This project uses modern web technologies that are industry-standard and beginner-friendly:

- **Next.js 14** - React framework for building web applications
- **TypeScript** - JavaScript with type safety (helps catch bugs early)
- **Tailwind CSS** - Utility-first CSS framework for styling
- **Prisma** - Database ORM (Object-Relational Mapping)
- **PostgreSQL** - Robust, scalable database

### Why This Stack?

- **Next.js**: Handles both the frontend (what users see) and backend (API) in one codebase
- **TypeScript**: Adds "types" to JavaScript, making it clearer what data structures you're working with
- **Prisma**: Makes database operations intuitive with a clear syntax
- **PostgreSQL**: A professional-grade database that's free and open-source

## Project Structure

```
Idea-Map/
├── app/                      # Next.js App Router directory
│   ├── api/                  # Backend API routes
│   │   ├── content/          # Content CRUD operations
│   │   ├── tags/             # Tag management
│   │   └── sources/          # Source management
│   ├── admin/                # Admin dashboard for adding content
│   │   ├── page.tsx          # Admin page component
│   │   └── ContentForm.tsx   # Form for adding content
│   ├── layout.tsx            # Root layout (wraps all pages)
│   ├── page.tsx              # Home page (public content display)
│   ├── ContentList.tsx       # Component to display content items
│   └── globals.css           # Global styles
├── lib/                      # Utility libraries
│   └── prisma.ts             # Prisma client setup
├── prisma/                   # Database configuration
│   └── schema.prisma         # Database schema definition
├── package.json              # Project dependencies
└── README.md                 # This file
```

## How It Works

### Architecture Overview

1. **Database Layer (Prisma + PostgreSQL)**
   - Stores all your content, tags, sources, and relationships
   - Prisma provides a type-safe way to interact with the database
   - Schema is defined in `prisma/schema.prisma`

2. **API Layer (Next.js API Routes)**
   - Located in `app/api/`
   - Handles CRUD operations (Create, Read, Update, Delete)
   - Routes:
     - `GET /api/content` - Fetch content items
     - `POST /api/content` - Create new content
     - `GET /api/tags` - Fetch all tags
     - `POST /api/tags` - Create new tag
     - `GET /api/sources` - Fetch all sources
     - `POST /api/sources` - Create new source

3. **Frontend Layer (React Components)**
   - **Public View** (`/`): Displays your content collection with filtering
   - **Admin View** (`/admin`): Form to add and manage content
   - Uses React hooks (`useState`, `useEffect`) to manage state
   - Fetches data from API routes

### Data Model

The database has these main entities:

**ContentItem**
- The core entity - represents an article, video, podcast, etc.
- Fields: title, url, description, type, annotations, insights
- Related to: Source, Tags

**Tag**
- Categories for organizing content (e.g., "AI", "Product", "Startups")
- Can be applied to multiple content items
- Has a color for visual organization

**Source**
- Where content came from (e.g., "Morning Brew", "a16z Podcast")
- Can be newsletters, websites, people, etc.

**Connection** (Future use)
- Links between content items to show relationships
- Helps surface patterns across different pieces of content

## Setup Instructions

### Prerequisites

You'll need:
- Node.js (version 18 or higher)
- PostgreSQL database (local or hosted)

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd Idea-Map

# Install dependencies
npm install
```

### 2. Set Up Database

You have two options:

#### Option A: Local PostgreSQL
```bash
# Install PostgreSQL on your machine
# Then create a database
createdb ideamap
```

#### Option B: Hosted Database (Recommended for beginners)
Use a free hosted PostgreSQL service:
- [Supabase](https://supabase.com) (Free tier available)
- [Neon](https://neon.tech) (Free tier available)
- [Railway](https://railway.app) (Free trial available)

### 3. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your database URL
# Example: DATABASE_URL="postgresql://user:password@localhost:5432/ideamap"
```

### 4. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations (creates tables)
npx prisma migrate dev --name init
```

This creates all the necessary tables in your database based on the schema.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

## Usage

### Adding Content

1. Navigate to `/admin` (or click "Admin Dashboard" link)
2. Fill out the form:
   - **Title**: Name of the content (required)
   - **URL**: Link to the content (optional but recommended)
   - **Type**: Article, Video, Podcast, Book, etc.
   - **Description**: Brief summary
   - **Source**: Where you found it (create sources as needed)
   - **Tags**: Apply multiple tags for categorization
   - **Notes**: Your personal thoughts and takeaways
   - **Insights**: Business ideas, 2nd/3rd order effects, connections

3. Click "Add Content"

### Viewing Content

1. Visit the home page (`/`)
2. Use filters to narrow by:
   - **Type**: Show only articles, videos, podcasts, etc.
   - **Tag**: Show content with specific tags
3. Content displays with all your annotations and insights

## Learning Resources

As you work with this codebase, here are some concepts to understand:

### React Concepts
- **Components**: Reusable pieces of UI (e.g., `ContentForm.tsx`)
- **State**: Data that changes over time (managed with `useState`)
- **Effects**: Side effects like fetching data (managed with `useEffect`)
- **Props**: Data passed from parent to child components

### TypeScript Concepts
- **Interfaces**: Define the "shape" of objects (e.g., `interface ContentItem`)
- **Types**: Specify what type of data a variable holds (string, number, etc.)

### Next.js Concepts
- **App Router**: File-based routing (files in `app/` become routes)
- **API Routes**: Server-side endpoints in `app/api/`
- **Server vs Client Components**: Server components render on server, client components use browser features

### Database Concepts
- **Schema**: Definition of your database structure (tables, fields, relationships)
- **Migrations**: Changes to your database schema over time
- **ORM**: Prisma translates JavaScript code into SQL queries

## Next Steps & Future Enhancements

This is v1 of your content curation platform. Here are ideas for expansion:

### Near-Term
- [ ] Email forwarding integration for newsletters
- [ ] Bulk import from CSV or JSON
- [ ] Search functionality
- [ ] Edit/delete content items
- [ ] Connection visualization (graph view)

### Medium-Term
- [ ] Browser extension for one-click content saving
- [ ] RSS feed ingestion
- [ ] AI-powered content summarization
- [ ] Automatic tag suggestions
- [ ] Weekly digest email

### Long-Term
- [ ] Collaborative features (share with team)
- [ ] API for third-party integrations
- [ ] Mobile app
- [ ] Advanced analytics on reading patterns
- [ ] Business idea generator based on connections

## Deployment

When ready to deploy publicly:

### Recommended: Vercel (Made by Next.js creators)

1. Push code to GitHub
2. Sign up at [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Add environment variables (DATABASE_URL)
5. Deploy!

Vercel automatically handles:
- SSL certificates
- CDN distribution
- Automatic deployments on git push

## Troubleshooting

**Database connection errors**
- Check your DATABASE_URL in `.env`
- Ensure PostgreSQL is running
- Verify database exists

**"Module not found" errors**
- Run `npm install` again
- Delete `node_modules` and `package-lock.json`, then reinstall

**Prisma errors**
- Run `npx prisma generate` to regenerate client
- Check `prisma/schema.prisma` for syntax errors

## Questions or Ideas?

This is your platform - modify it, extend it, make it yours! The codebase is designed to be readable and extensible.

Key files to modify for common changes:
- **Add fields to content**: Edit `prisma/schema.prisma`
- **Change UI styling**: Edit component files (`.tsx`) and Tailwind classes
- **Add new content types**: Add to `ContentType` enum in schema
- **Customize public page layout**: Edit `app/page.tsx` and `app/ContentList.tsx`

Happy curating!
