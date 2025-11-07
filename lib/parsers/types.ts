/**
 * Base Parser Interface
 *
 * All content parsers must implement this interface.
 * This creates a "contract" - every parser has the same methods,
 * making them interchangeable.
 */

import { ContentType } from '@prisma/client';

// Represents an email to be parsed
export interface IncomingEmail {
  from: string;
  subject?: string;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
}

// Represents an extracted content item
export interface ExtractedItem {
  title: string;
  url?: string;
  description?: string;
  type: ContentType;

  // Rich metadata
  category?: string;    // e.g., "News", "Ideas", "Data"
  section?: string;     // Subsection or topic
  authorNote?: string;  // Original author's commentary/annotation

  suggestedTags?: string[];
  confidence?: number; // 0-1, how confident the parser is
}

// Result of parsing
export interface ParseResult {
  success: boolean;
  items: ExtractedItem[];
  error?: string;
}

/**
 * Base Parser Interface
 *
 * Every parser must implement these methods:
 * - canHandle: Determines if this parser can handle the email
 * - parse: Extracts items from the email
 */
export interface ContentParser {
  /**
   * Unique identifier for this parser
   */
  readonly name: string;

  /**
   * Human-readable description
   */
  readonly description: string;

  /**
   * Determines if this parser can handle the given email
   * @param email - The incoming email
   * @returns true if this parser should be used
   */
  canHandle(email: IncomingEmail): boolean;

  /**
   * Parse the email and extract content items
   * @param email - The incoming email
   * @returns Array of extracted items
   */
  parse(email: IncomingEmail): Promise<ParseResult>;
}
