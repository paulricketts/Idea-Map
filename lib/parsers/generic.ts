/**
 * Generic Newsletter Parser
 *
 * A fallback parser that extracts links from any email.
 * Less sophisticated than specific parsers, but works with any content.
 */

import { ContentParser, IncomingEmail, ParseResult, ExtractedItem } from './types';
import { ContentType } from '@prisma/client';

export class GenericParser implements ContentParser {
  readonly name = 'generic';
  readonly description = 'Generic parser for any newsletter or email';

  /**
   * This parser can handle any email (fallback)
   */
  canHandle(email: IncomingEmail): boolean {
    // Always return true - this is the fallback parser
    return true;
  }

  /**
   * Extract all links from the email
   */
  async parse(email: IncomingEmail): Promise<ParseResult> {
    try {
      const html = email.html || '';
      const text = email.text || '';
      const items: ExtractedItem[] = [];

      // Extract from HTML if available
      if (html) {
        const htmlItems = this.extractFromHtml(html);
        items.push(...htmlItems);
      }

      // Extract from text if HTML failed or no HTML available
      if (items.length === 0 && text) {
        const textItems = this.extractFromText(text);
        items.push(...textItems);
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
   * Extract links from HTML
   */
  private extractFromHtml(html: string): ExtractedItem[] {
    const items: ExtractedItem[] = [];
    const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
    let match;

    while ((match = linkPattern.exec(html)) !== null) {
      const url = match[1];
      const title = this.cleanText(match[2]);

      if (this.shouldSkipUrl(url) || title.length < 3) {
        continue;
      }

      items.push({
        title,
        url,
        type: this.guessContentType(url),
        confidence: 0.5 // Lower confidence for generic parsing
      });
    }

    return items;
  }

  /**
   * Extract URLs from plain text
   */
  private extractFromText(text: string): ExtractedItem[] {
    const items: ExtractedItem[] = [];
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    let match;

    while ((match = urlPattern.exec(text)) !== null) {
      const url = match[1];

      if (this.shouldSkipUrl(url)) {
        continue;
      }

      // Use domain as title
      const title = this.extractDomainName(url);

      items.push({
        title,
        url,
        type: this.guessContentType(url),
        confidence: 0.4 // Even lower confidence for text-only
      });
    }

    return items;
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
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Determine if we should skip this URL
   */
  private shouldSkipUrl(url: string): boolean {
    const skipPatterns = [
      'unsubscribe',
      'preferences',
      'settings',
      'mailto:',
      'tel:',
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.svg',
      '.css',
      '.js',
      'tracking',
      'pixel'
    ];

    const urlLower = url.toLowerCase();
    return skipPatterns.some(pattern => urlLower.includes(pattern));
  }

  /**
   * Guess content type based on URL
   */
  private guessContentType(url: string): ContentType {
    const urlLower = url.toLowerCase();

    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || urlLower.includes('vimeo.com')) {
      return 'VIDEO';
    }

    if (urlLower.includes('podcast') || urlLower.includes('spotify.com/episode') || urlLower.includes('apple.com/podcast')) {
      return 'PODCAST';
    }

    if (urlLower.includes('twitter.com') || urlLower.includes('x.com') || urlLower.includes('tweet')) {
      return 'TWEET';
    }

    if (urlLower.includes('substack.com') || urlLower.includes('newsletter')) {
      return 'NEWSLETTER';
    }

    return 'ARTICLE';
  }

  /**
   * Extract domain name from URL
   */
  private extractDomainName(url: string): string {
    try {
      const urlObj = new URL(url);
      let domain = urlObj.hostname.replace('www.', '');

      // Try to extract a better title from the path
      const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1]
          .replace(/-/g, ' ')
          .replace(/_/g, ' ')
          .replace(/\.\w+$/, '') // Remove file extension
          .trim();

        if (lastPart.length > 3) {
          return lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
        }
      }

      return domain;
    } catch {
      return url.substring(0, 50);
    }
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
