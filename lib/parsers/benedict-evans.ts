/**
 * Benedict Evans Newsletter Parser
 *
 * Parses the Benedict Evans newsletter which typically contains:
 * - Multiple links to articles
 * - Brief descriptions
 * - Tech and AI focus
 */

import { ContentParser, IncomingEmail, ParseResult, ExtractedItem } from './types';
import { ContentType } from '@prisma/client';

export class BenedictEvansParser implements ContentParser {
  readonly name = 'benedict-evans';
  readonly description = 'Parser for Benedict Evans newsletter';

  /**
   * Check if this email is from Benedict Evans
   */
  canHandle(email: IncomingEmail): boolean {
    const from = email.from.toLowerCase();
    const subject = email.subject?.toLowerCase() || '';

    // Check if it's from Benedict Evans
    // You'll need to update this with his actual email address
    return (
      from.includes('benedict') ||
      from.includes('ben-evans.com') ||
      subject.includes('benedict evans')
    );
  }

  /**
   * Parse the newsletter and extract links
   */
  async parse(email: IncomingEmail): Promise<ParseResult> {
    try {
      const html = email.html || '';
      const text = email.text || '';

      // Extract items from the newsletter
      const items: ExtractedItem[] = [];

      // Strategy: Look for links in the HTML
      // Benedict Evans newsletters typically have a clear link structure
      const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
      let match;

      while ((match = linkPattern.exec(html)) !== null) {
        const url = match[1];
        const title = match[2].trim();

        // Skip navigation links, social media, etc.
        if (this.shouldSkipUrl(url) || this.shouldSkipTitle(title)) {
          continue;
        }

        // Try to find description near the link
        const description = this.extractDescription(html, match.index);

        items.push({
          title,
          url,
          description,
          type: this.guessContentType(url),
          suggestedTags: ['Tech', 'AI'],
          confidence: 0.8
        });
      }

      // If HTML parsing failed, try text parsing
      if (items.length === 0 && text) {
        return this.parseText(text);
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
   * Parse plain text version of the newsletter
   */
  private parseText(text: string): ParseResult {
    const items: ExtractedItem[] = [];

    // Look for URLs in text
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlPattern) || [];

    for (const url of urls) {
      if (this.shouldSkipUrl(url)) continue;

      // Try to find text before the URL as title
      const urlIndex = text.indexOf(url);
      const textBefore = text.substring(Math.max(0, urlIndex - 200), urlIndex);
      const lines = textBefore.split('\n');
      const title = lines[lines.length - 1].trim() || this.extractDomainName(url);

      items.push({
        title,
        url,
        type: this.guessContentType(url),
        suggestedTags: ['Tech', 'AI'],
        confidence: 0.6
      });
    }

    return {
      success: true,
      items: this.deduplicateItems(items)
    };
  }

  /**
   * Try to extract description from the HTML near a link
   */
  private extractDescription(html: string, linkIndex: number): string | undefined {
    // Look for text after the link, up to next link or 300 chars
    const afterLink = html.substring(linkIndex + 100, linkIndex + 400);
    const textMatch = afterLink.match(/>([^<]+)</);

    if (textMatch && textMatch[1]) {
      const desc = textMatch[1].trim();
      if (desc.length > 20 && desc.length < 500) {
        return desc;
      }
    }

    return undefined;
  }

  /**
   * Determine if we should skip this URL
   */
  private shouldSkipUrl(url: string): boolean {
    const skipPatterns = [
      'unsubscribe',
      'twitter.com',
      'linkedin.com',
      'facebook.com',
      'instagram.com',
      'mailto:',
      'tel:',
      '.png',
      '.jpg',
      '.gif'
    ];

    return skipPatterns.some(pattern => url.toLowerCase().includes(pattern));
  }

  /**
   * Determine if we should skip this title
   */
  private shouldSkipTitle(title: string): boolean {
    const skipPatterns = [
      'unsubscribe',
      'view in browser',
      'forward',
      'share',
      'tweet',
      'post',
      'click here'
    ];

    return skipPatterns.some(pattern => title.toLowerCase().includes(pattern));
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
