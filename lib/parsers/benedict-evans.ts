/**
 * Benedict Evans Newsletter Parser
 *
 * Parses Benedict Evans' newsletter with its specific structure:
 * - Categories: News, Ideas, Outside Interests, Data
 * - News section: h3/h4 titles + commentary paragraphs
 * - Other sections: paragraphs with embedded links
 * - Extracts Benedict's annotations/commentary
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
      from.includes('ben-evans') ||
      from.includes('us6.list-manage.com') ||
      subject.includes('benedict')
    );
  }

  async parse(email: IncomingEmail): Promise<ParseResult> {
    try {
      const html = email.html || '';
      const items: ExtractedItem[] = [];

      // Find all category sections
      // Categories are marked by <h1> (News) or <h2> (Ideas, Outside interests, Data) with class="null"
      const categoryPattern = /<h[12][^>]*class=["']null["'][^>]*>(.*?)<\/h[12]>/gi;
      const categories: Array<{ name: string; position: number }> = [];

      let match;
      while ((match = categoryPattern.exec(html)) !== null) {
        const categoryName = this.cleanText(match[1]);
        if (this.isValidCategory(categoryName)) {
          categories.push({
            name: this.normalizeCategory(categoryName),
            position: match.index
          });
        }
      }

      // Process each category section
      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        const nextCategory = categories[i + 1];

        // Extract HTML between this category and the next
        const sectionEnd = nextCategory ? nextCategory.position : html.length;
        const sectionHtml = html.substring(category.position, sectionEnd);

        // Different parsing strategy for News vs other sections
        if (category.name === 'News') {
          items.push(...this.parseNewsSection(sectionHtml, category.name));
        } else {
          items.push(...this.parseOtherSection(sectionHtml, category.name));
        }
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
   * Parse News section - has h3/h4 titles followed by paragraphs
   */
  private parseNewsSection(html: string, category: string): ExtractedItem[] {
    const items: ExtractedItem[] = [];

    // Match h3 or h4 titles followed by paragraphs until the next h3/h4
    const itemPattern = /<h[34][^>]*>(.*?)<\/h[34]>\s*<p[^>]*>([\s\S]*?)(?=<h[34]|<h2|$)/gi;
    let match;

    while ((match = itemPattern.exec(html)) !== null) {
      const title = this.cleanText(match[1]);
      const paragraphHtml = match[2];

      // Extract links from the paragraph
      const links = this.extractLinks(paragraphHtml);

      // Extract Benedict's commentary (text before the links)
      const commentary = this.extractCommentary(paragraphHtml);

      // Create an item for each link (usually just one, but sometimes multiple)
      if (links.length > 0) {
        links.forEach(link => {
          items.push({
            title: title || this.extractDomainName(link.url),
            url: link.url,
            type: this.guessContentType(link.url),
            category,
            authorNote: commentary || undefined,
            suggestedTags: this.suggestTags(category),
            confidence: 0.9
          });
        });
      } else if (title) {
        // No link but has a title - still add it
        items.push({
          title,
          type: 'ARTICLE',
          category,
          authorNote: commentary || undefined,
          suggestedTags: this.suggestTags(category),
          confidence: 0.7
        });
      }
    }

    return items;
  }

  /**
   * Parse Ideas/Outside Interests/Data sections - just paragraphs with links
   */
  private parseOtherSection(html: string, category: string): ExtractedItem[] {
    const items: ExtractedItem[] = [];

    // Find all paragraphs in the section
    const paragraphPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let match;

    while ((match = paragraphPattern.exec(html)) !== null) {
      const paragraphHtml = match[1];

      // Skip if this is styled text or preview
      if (paragraphHtml.includes('color:#808080') || paragraphHtml.includes('color:#A9A9A9')) {
        continue;
      }

      // Extract links from this paragraph
      const links = this.extractLinks(paragraphHtml);

      if (links.length === 0) continue;

      // Extract commentary (everything before the first link)
      const commentary = this.extractCommentary(paragraphHtml);

      // For multiple links in one paragraph, use the commentary as the title
      // and create separate items for each link
      if (links.length > 1) {
        links.forEach(link => {
          items.push({
            title: link.text || this.extractDomainName(link.url),
            url: link.url,
            type: this.guessContentType(link.url),
            category,
            authorNote: commentary || undefined,
            suggestedTags: this.suggestTags(category),
            confidence: 0.85
          });
        });
      } else {
        // Single link - use commentary as description, first sentence as title
        const title = this.extractFirstSentence(commentary) || links[0].text || this.extractDomainName(links[0].url);
        items.push({
          title,
          url: links[0].url,
          description: commentary && commentary !== title ? commentary : undefined,
          type: this.guessContentType(links[0].url),
          category,
          authorNote: commentary || undefined,
          suggestedTags: this.suggestTags(category),
          confidence: 0.85
        });
      }
    }

    return items;
  }

  /**
   * Extract all links from HTML with their anchor text
   */
  private extractLinks(html: string): Array<{ url: string; text: string }> {
    const links: Array<{ url: string; text: string }> = [];
    const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
    let match;

    while ((match = linkPattern.exec(html)) !== null) {
      const url = match[1];
      const text = this.cleanText(match[2]);

      if (this.shouldSkipUrl(url)) continue;

      links.push({ url, text });
    }

    return links;
  }

  /**
   * Extract Benedict's commentary (text before links, excluding HTML tags)
   */
  private extractCommentary(html: string): string | null {
    // Remove all <a> tags and their content
    const withoutLinks = html.replace(/<a[^>]*>.*?<\/a>/gi, '');

    // Remove all HTML tags
    let text = withoutLinks.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    text = this.cleanText(text);

    // Trim and return if substantial
    text = text.trim();

    if (text.length > 15 && text.length < 2000) {
      return text;
    }

    return null;
  }

  /**
   * Extract first sentence from text for use as title
   */
  private extractFirstSentence(text: string | null): string | null {
    if (!text) return null;

    const match = text.match(/^([^.!?]+[.!?])/);
    if (match && match[1].length < 200) {
      return match[1].trim();
    }

    // If no sentence marker, take first 100 chars
    if (text.length > 100) {
      return text.substring(0, 100).trim() + '...';
    }

    return text.trim();
  }

  /**
   * Check if this is a valid category name
   */
  private isValidCategory(name: string): boolean {
    const validCategories = ['news', 'ideas', 'outside interests', 'data', 'preview'];
    return validCategories.some(cat => name.toLowerCase().includes(cat));
  }

  /**
   * Normalize category names to standard values
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
   * Suggest tags based on category
   */
  private suggestTags(category: string): string[] {
    const baseTags = ['Tech', 'Benedict Evans'];

    const categoryTags: Record<string, string[]> = {
      'News': ['News', 'Industry News'],
      'Ideas': ['Analysis', 'Commentary'],
      'Outside Interests': ['Culture', 'Misc'],
      'Data': ['Data', 'Statistics', 'Research']
    };

    return [...baseTags, ...(categoryTags[category] || [])];
  }

  /**
   * Guess content type based on URL
   */
  private guessContentType(url: string): ContentType {
    const urlLower = url.toLowerCase();

    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || urlLower.includes('vimeo.com')) {
      return 'VIDEO';
    }

    if (urlLower.includes('podcast') || urlLower.includes('spotify.com/episode')) {
      return 'PODCAST';
    }

    if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
      return 'TWEET';
    }

    return 'ARTICLE';
  }

  /**
   * Extract domain name from URL for use as fallback title
   */
  private extractDomainName(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url.substring(0, 50);
    }
  }

  /**
   * Clean HTML entities and extra whitespace from text
   */
  private cleanText(text: string): string {
    return text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&hellip;/g, '...')
      .replace(/=E2=80=99/g, "'")
      .replace(/=E2=80=9[CD]/g, '"')
      .replace(/=E2=80=9[34]/g, '"')
      .replace(/=E2=80=A6/g, '...')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Determine if we should skip this URL
   */
  private shouldSkipUrl(url: string): boolean {
    const skipPatterns = [
      'unsubscribe',
      'list-manage.com/track',
      'mailto:',
      'tel:',
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      'ben-evans.com/archive',
      'squarespace.com/static'
    ];

    const urlLower = url.toLowerCase();
    return skipPatterns.some(pattern => urlLower.includes(pattern));
  }

  /**
   * Remove duplicate items based on URL
   */
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
