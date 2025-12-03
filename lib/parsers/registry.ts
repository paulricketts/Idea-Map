/**
 * Parser Registry
 *
 * This is the "Strategy Pattern" in action:
 * - Multiple strategies (parsers) available
 * - At runtime, choose which strategy to use
 * - Easy to add new strategies without changing existing code
 */

import { ContentParser, IncomingEmail } from './types';

class ParserRegistry {
  private parsers: Map<string, ContentParser> = new Map();

  /**
   * Register a new parser
   * @param parser - The parser to register
   */
  register(parser: ContentParser): void {
    this.parsers.set(parser.name, parser);
    console.log(`[ParserRegistry] Registered parser: ${parser.name}`);
  }

  /**
   * Find a parser that can handle the given email
   * @param email - The incoming email
   * @returns The first parser that can handle it, or null
   */
  findParser(email: IncomingEmail): ContentParser | null {
    for (const parser of Array.from(this.parsers.values())) {
      if (parser.canHandle(email)) {
        console.log(`[ParserRegistry] Found parser: ${parser.name}`);
        return parser;
      }
    }
    console.log('[ParserRegistry] No parser found for email');
    return null;
  }

  /**
   * Get all registered parsers
   */
  getAllParsers(): ContentParser[] {
    return Array.from(this.parsers.values());
  }

  /**
   * Get a parser by name
   */
  getParser(name: string): ContentParser | undefined {
    return this.parsers.get(name);
  }
}

// Singleton instance
export const parserRegistry = new ParserRegistry();