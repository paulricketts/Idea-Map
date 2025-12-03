/**
 * Benedict Evans Newsletter Parser
 *
 * Parses Benedict Evans' newsletter with its specific structure:
 * - Categories: My Work, News, Ideas, Outside Interests, Data
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
      // Categories are marked by <h1> or <h2> with class="null"
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

      console.log(`[BenedictEvansParser] Found ${categories.length} categories:`, categories.map(c => c.name));

      // Process each category section
      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        const nextCategory = categories[i + 1];

        // Extract HTML between this category and the next
        const sectionEnd = nextCategory ? nextCategory.position : html.length;
        const sectionHtml = html.substring(category.position, sectionEnd);

        // Different parsing strategy for News vs other sections
        let sectionItems: ExtractedItem[];
        if (category.name === 'News') {
          sectionItems = this.parseNewsSection(sectionHtml, category.name);
        } else {
          sectionItems = this.parseOtherSection(sectionHtml, category.name);
        }
        
        console.log(`[BenedictEvansParser] ${category.name}: extracted ${sectionItems.length} items`);
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
   * Parse News section - has h3/h4 titles followed by paragraphs
   */
  private parseNewsSection(html: string, category: string): ExtractedItem[] {
    const items: ExtractedItem[] = [];

    // Match h3 or h4 titles followed by content until the next h3/h4 or section end
    const itemPattern = /<h[34][^>]*>(.*?)<\/h[34]>([\s\S]*?)(?=<h[34]|<h[12]|$)/gi;
    let match;

    while ((match = itemPattern.exec(html)) !== null) {
      const title = this.cleanText(match[1]);
      const contentHtml = match[2];

      // Extract links from the content
      const links = this.extractLinks(contentHtml);

      // Extract Benedict's commentary (text content)
      const commentary = this.extractCommentary(contentHtml);

      // Create an item for each link, or one item if no links
      if (links.length > 0) {
        // For news items, use the h3/h4 title and attach all links
        // Usually there's one main link, sometimes multiple sources
        items.push({
          title: title,
          url: links[0].url, // Primary link
          type: this.guessContentType(links[0].url),
          category,
          authorNote: commentary || undefined,
          suggestedTags: this.suggestTags(category),
          confidence: 0.9
        });
      } else if (title && commentary) {
        // No link but has a title and content - still add it
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
   * Parse Ideas/Outside Interests/Data/My Work sections - paragraphs with links
   */
  private parseOtherSection(html: string, category: string): ExtractedItem[] {
    const items: ExtractedItem[] = [];

    // First check for h3/h4 structured items (like in My Work)
    const structuredPattern = /<h[34][^>]*>(.*?)<\/h[34]>([\s\S]*?)(?=<h[34]|<h[12]|$)/gi;
    let hasStructuredItems = false;
    let match;

    while ((match = structuredPattern.exec(html)) !== null) {
      const title = this.cleanText(match[1]);
      const contentHtml = match[2];
      
      if (!title) continue;
      
      hasStructuredItems = true;
      const links = this.extractLinks(contentHtml);
      const commentary = this.extractCommentary(contentHtml);

      if (links.length > 0) {
        items.push({
          title: title,
          url: links[0].url,
          type: this.guessContentType(links[0].url),
          category,
          authorNote: commentary || undefined,
          suggestedTags: this.suggestTags(category),
          confidence: 0.9
        });
      } else if (commentary) {
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

    // If no structured items, parse as paragraphs with embedded links
    if (!hasStructuredItems) {
      // Find all paragraphs in the section
      const paragraphPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;

      while ((match = paragraphPattern.exec(html)) !== null) {
        const paragraphHtml = match[1];

        // Skip styled/preview text (gray text is usually just formatting)
        if (paragraphHtml.includes('color:#808080') || 
            paragraphHtml.includes('color:#A9A9A9') ||
            paragraphHtml.includes('color:#D3D3D3')) {
          continue;
        }

        // Extract links from this paragraph
        const links = this.extractLinks(paragraphHtml);

        if (links.length === 0) continue;

        // Extract commentary (everything except links)
        const commentary = this.extractCommentary(paragraphHtml);

        // Determine the best title:
        // 1. Use link text if it's meaningful (not just "LINK", "here", "this", etc.)
        // 2. Otherwise, leave title empty so user must provide one
        const linkText = links[0].text;
        const title = this.isValidLinkTitle(linkText) ? linkText : '';
        
        items.push({
          title,
          url: links[0].url,
          description: commentary || undefined,
          type: this.guessContentType(links[0].url),
          category,
          authorNote: commentary || undefined,
          suggestedTags: this.suggestTags(category),
          confidence: title ? 0.85 : 0.6  // Lower confidence for items without real titles
        });
      }
    }

    return items;
  }

  /**
   * Check if a link's anchor text is a valid/meaningful title
   */
  private isValidLinkTitle(text: string): boolean {
    if (!text) return false;
    
    const normalizedText = text.toLowerCase().trim();
    
    // List of generic/unhelpful link texts
    const invalidTitles = [
      'link',
      'here',
      'this',
      'click here',
      'read more',
      'more',
      'source',
      'article',
      'post',
      'via',
      'see',
      'see here',
      'read',
      'view',
      ''
    ];
    
    // Must be at least 3 characters and not in the invalid list
    return normalizedText.length >= 3 && !invalidTitles.includes(normalizedText);
  }

  /**
   * Extract all links from HTML with their anchor text
   */
  private extractLinks(html: string): Array<{ url: string; text: string }> {
    const links: Array<{ url: string; text: string }> = [];
    const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
    let match;

    while ((match = linkPattern.exec(html)) !== null) {
      let url = match[1];
      const text = this.cleanText(match[2]);

      // Skip non-content URLs (but NOT tracking URLs - they redirect to real content)
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
    const validCategories = ['my work', 'news', 'ideas', 'outside interests', 'data', 'preview'];
    return validCategories.some(cat => name.toLowerCase().includes(cat));
  }

  /**
   * Normalize category names to standard values
   */
  private normalizeCategory(rawCategory: string): string {
    const lower = rawCategory.toLowerCase();

    if (lower.includes('my work') || lower.includes('work')) return 'My Work';
    if (lower.includes('news')) return 'News';
    if (lower.includes('idea')) return 'Ideas';
    if (lower.includes('outside') || lower.includes('interest')) return 'Outside Interests';
    if (lower.includes('data')) return 'Data';
    if (lower.includes('preview')) return 'Preview';

    return rawCategory;
  }

  /**
   * Suggest tags based on category
   */
  private suggestTags(category: string): string[] {
    const baseTags = ['Tech', 'Benedict Evans'];

    const categoryTags: Record<string, string[]> = {
      'My Work': ['Benedict Evans', 'Analysis'],
      'News': ['News', 'Industry News'],
      'Ideas': ['Analysis', 'Commentary'],
      'Outside Interests': ['Culture', 'Misc'],
      'Data': ['Data', 'Statistics', 'Research'],
      'Preview': ['Premium']
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
   * Determine if we should skip this URL (not content links)
   * NOTE: We do NOT skip list-manage.com/track URLs - those are tracking redirects
   * that point to real content!
   */
  private shouldSkipUrl(url: string): boolean {
    const skipPatterns = [
      'unsubscribe',
      'mailto:',
      'tel:',
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.webp',
      'ben-evans.com/archive',
      'squarespace.com/static',
      'mcusercontent.com/images'  // Skip image URLs only
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