# Building a Custom Parser: Benedict Evans Example

## The Problem

The generic parser I built extracts all links, but misses the **rich structure** that Benedict Evans creates:
- **Categories**: "News", "Ideas", "Outside Interests", "Data"
- **His annotations**: Commentary on why each link matters
- **Organization**: How he groups related content

To extract this, we need to **look at the actual HTML structure**.

## Step 1: Get the Real HTML

### Option A: View Email Source
1. Open a Benedict Evans newsletter in your email
2. In Gmail: Click ⋮ menu → "Show original"
3. In Outlook: Right-click → "View source"
4. Copy the HTML

### Option B: Forward to Yourself
1. Forward the email to yourself
2. Right-click the email → "View page source"
3. Copy the HTML

### Option C: Use Developer Tools
1. Open the email in a browser (Gmail, Outlook web)
2. Press F12 (Developer Tools)
3. Inspect the email content
4. Copy the HTML

## Step 2: Analyze the Structure

Save the HTML to a file and look for patterns:

```bash
# Save to a file
cat > benedict-evans-sample.html

# Search for structure
grep -i "<h2" benedict-evans-sample.html  # Section headers?
grep -i "<h3" benedict-evans-sample.html  # Subsections?
grep -i "news" benedict-evans-sample.html # Category markers?
```

Common newsletter structures:

### Pattern 1: Headers for Categories
```html
<h2>News</h2>
<p>
  <a href="https://example.com">Article Title</a><br>
  Benedict's annotation about this article...
</p>
<p>
  <a href="https://example2.com">Another Article</a><br>
  More commentary...
</p>

<h2>Ideas</h2>
...
```

### Pattern 2: Divs with Classes
```html
<div class="section-news">
  <div class="item">
    <a href="...">Title</a>
    <p class="annotation">His thoughts...</p>
  </div>
</div>
```

### Pattern 3: Tables
```html
<table>
  <tr>
    <td colspan="2"><strong>News</strong></td>
  </tr>
  <tr>
    <td><a href="...">Title</a></td>
    <td>Annotation</td>
  </tr>
</table>
```

## Step 3: Update the Parser

Once you know the structure, update the parser.

### Example: If Benedict Uses H2 Headers

```typescript
/**
 * Improved Benedict Evans Parser
 * Extracts categories, annotations, and structure
 */

import { ContentParser, IncomingEmail, ParseResult, ExtractedItem } from './types';
import { ContentType } from '@prisma/client';

export class BenedictEvansParser implements ContentParser {
  readonly name = 'benedict-evans';
  readonly description = 'Parser for Benedict Evans newsletter with rich metadata';

  canHandle(email: IncomingEmail): boolean {
    const from = email.from.toLowerCase();
    const subject = email.subject?.toLowerCase() || '';

    return (
      from.includes('benedict') ||
      from.includes('ben-evans.com') ||
      subject.includes('benedict evans')
    );
  }

  async parse(email: IncomingEmail): Promise<ParseResult> {
    try {
      const html = email.html || '';
      const items: ExtractedItem[] = [];

      // Split HTML by section headers (adjust based on actual format!)
      const sections = this.extractSections(html);

      for (const section of sections) {
        const category = section.category;
        const sectionItems = this.extractItemsFromSection(section.html, category);
        items.push(...sectionItems);
      }

      return {
        success: true,
        items: this.deduplicateItems(items)
      };
    } catch (error) {
      return {
        success: false,
        items: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Extract sections from the newsletter
   * Adjust regex based on actual HTML structure!
   */
  private extractSections(html: string): Array<{ category: string; html: string }> {
    const sections: Array<{ category: string; html: string }> = [];

    // Example: Split by <h2> tags
    // YOU'LL NEED TO ADJUST THIS based on the real HTML!
    const sectionPattern = /<h2[^>]*>(.*?)<\/h2>([\s\S]*?)(?=<h2|$)/gi;
    let match;

    while ((match = sectionPattern.exec(html)) !== null) {
      const category = this.cleanText(match[1]);
      const sectionHtml = match[2];

      // Map to standard categories
      const normalizedCategory = this.normalizeCategory(category);

      sections.push({
        category: normalizedCategory,
        html: sectionHtml
      });
    }

    // If no sections found, treat whole email as one section
    if (sections.length === 0) {
      sections.push({ category: 'General', html });
    }

    return sections;
  }

  /**
   * Normalize category names
   */
  private normalizeCategory(rawCategory: string): string {
    const lower = rawCategory.toLowerCase();

    if (lower.includes('news')) return 'News';
    if (lower.includes('idea')) return 'Ideas';
    if (lower.includes('outside') || lower.includes('interest')) return 'Outside Interests';
    if (lower.includes('data')) return 'Data';

    return rawCategory;
  }

  /**
   * Extract items from a section
   */
  private extractItemsFromSection(html: string, category: string): ExtractedItem[] {
    const items: ExtractedItem[] = [];

    // Look for link + annotation pattern
    // Example: <a href="...">Title</a><br>Annotation text...

    const itemPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>[\s\S]*?(?:<br>|<\/p>)([\s\S]*?)(?=<a|<h2|<h3|$)/gi;
    let match;

    while ((match = itemPattern.exec(html)) !== null) {
      const url = match[1];
      const title = this.cleanText(match[2]);
      const afterLink = match[3];

      if (this.shouldSkipUrl(url) || this.shouldSkipTitle(title)) {
        continue;
      }

      // Extract annotation (text after the link, before next link)
      const authorNote = this.extractAnnotation(afterLink);

      items.push({
        title,
        url,
        type: this.guessContentType(url),
        category,
        authorNote: authorNote || undefined,
        suggestedTags: this.suggestTags(category),
        confidence: 0.85
      });
    }

    return items;
  }

  /**
   * Extract Benedict's annotation from text after a link
   */
  private extractAnnotation(text: string): string | null {
    // Remove HTML tags
    let clean = text
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .trim();

    // If it's substantial text (not just whitespace or a single word)
    if (clean.length > 10 && clean.length < 1000) {
      return clean;
    }

    return null;
  }

  /**
   * Suggest tags based on category
   */
  private suggestTags(category: string): string[] {
    const baseTags = ['Tech', 'AI'];

    const categoryTags: Record<string, string[]> = {
      'News': ['News', 'Current Events'],
      'Ideas': ['Ideas', 'Analysis'],
      'Outside Interests': ['Culture', 'Misc'],
      'Data': ['Data', 'Statistics']
    };

    return [...baseTags, ...(categoryTags[category] || [])];
  }

  // ... (keep existing helper methods: shouldSkipUrl, guessContentType, etc.)

  private cleanText(text: string): string {
    return text
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  private shouldSkipUrl(url: string): boolean {
    const skipPatterns = ['unsubscribe', 'twitter.com', 'mailto:', '.png', '.jpg'];
    return skipPatterns.some(pattern => url.toLowerCase().includes(pattern));
  }

  private shouldSkipTitle(title: string): boolean {
    const skipPatterns = ['unsubscribe', 'view in browser', 'click here'];
    return skipPatterns.some(pattern => title.toLowerCase().includes(pattern));
  }

  private guessContentType(url: string): ContentType {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'VIDEO';
    if (urlLower.includes('podcast')) return 'PODCAST';
    if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'TWEET';
    return 'ARTICLE';
  }

  private deduplicateItems(items: ExtractedItem[]): ExtractedItem[] {
    const seen = new Set<string>();
    return items.filter(item => {
      if (!item.url) return true;
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  }
}
```

## Step 4: Test Your Parser

### Create a Test File

Save a sample email HTML to `test-newsletter.html`, then:

```typescript
// test-parser.ts
import { BenedictEvansParser } from './lib/parsers/benedict-evans';
import * as fs from 'fs';

async function testParser() {
  const html = fs.readFileSync('test-newsletter.html', 'utf-8');

  const parser = new BenedictEvansParser();
  const result = await parser.parse({
    from: 'benedict@example.com',
    subject: 'Test Newsletter',
    html
  });

  console.log('Success:', result.success);
  console.log('Items found:', result.items.length);

  result.items.forEach((item, i) => {
    console.log(`\n--- Item ${i + 1} ---`);
    console.log('Category:', item.category);
    console.log('Title:', item.title);
    console.log('URL:', item.url);
    console.log('Annotation:', item.authorNote?.substring(0, 100) + '...');
  });
}

testParser();
```

Run it:
```bash
npx tsx test-parser.ts
```

## Step 5: Iterate

The first version won't be perfect. You'll need to:

1. **Check the output** - Are all items extracted?
2. **Refine the regex** - Adjust patterns to match the actual HTML
3. **Test edge cases** - What if there's no annotation? Multiple links in one paragraph?
4. **Handle variations** - Newsletter format might change over time

## Common Patterns to Look For

### Finding Annotations

Benedict's commentary is usually:
- Right after the link
- Before the next link
- In a `<p>` tag, `<br>` separated, or plain text
- Between 20-500 characters typically

### Finding Categories

Look for:
- `<h2>` or `<h3>` tags
- `<strong>` or `<b>` tags
- `class="section-..."` divs
- Text like "NEWS:", "IDEAS:", etc.

### Finding Sections

Might be:
- Subtopics within a category
- Thematic groupings
- Could use smaller headers (`<h3>`, `<h4>`)

## Pro Tips

### Use Cheerio for Complex Parsing

If the HTML is complex, use the Cheerio library (jQuery for Node):

```typescript
import * as cheerio from 'cheerio';

const $ = cheerio.load(html);

// Find all h2 headers
$('h2').each((i, elem) => {
  const category = $(elem).text();

  // Get all content until next h2
  $(elem).nextUntil('h2').each((j, content) => {
    // Extract links and annotations
  });
});
```

Install it:
```bash
npm install cheerio
npm install -D @types/cheerio
```

### Log Everything While Developing

Add lots of console.logs to see what's being extracted:

```typescript
console.log('Found section:', category);
console.log('Section HTML length:', sectionHtml.length);
console.log('Extracted', items.length, 'items from this section');
```

### Start Simple, Add Complexity

1. First: Just extract links (done ✓)
2. Then: Add categories
3. Then: Add annotations
4. Finally: Handle edge cases

## What to Send Me

To help you build the perfect parser, send me:

1. **Sample HTML** - From one Benedict Evans email
2. **What you want extracted** - Categories? Annotations? Other metadata?
3. **Any challenges** - What's not working?

Then I can build a parser that perfectly matches his format!

## Update the UI

Once you're extracting richer metadata, update the review UI to show it:

In `/app/admin/ingest/page.tsx`, add:

```typescript
{item.category && (
  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">
    {item.category}
  </span>
)}

{item.authorNote && (
  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm italic">
    <strong>Benedict's note:</strong> {item.authorNote}
  </div>
)}
```

---

**The key insight**: Good parsers are built **iteratively** by looking at real data. The generic parser is a starting point - now we refine it based on the actual newsletter structure!
