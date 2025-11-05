/**
 * Parser Initialization
 *
 * This file imports all parsers and registers them.
 * To add a new parser:
 * 1. Create a new parser file implementing ContentParser interface
 * 2. Import it here
 * 3. Register it with the registry
 */

import { parserRegistry } from './registry';
import { BenedictEvansParser } from './benedict-evans';
import { GenericParser } from './generic';

// Register all parsers
// Order matters! More specific parsers should come first,
// generic parser should be last (it's the fallback)
parserRegistry.register(new BenedictEvansParser());
parserRegistry.register(new GenericParser());

console.log('[Parsers] Initialized', parserRegistry.getAllParsers().length, 'parsers');

export { parserRegistry };
export * from './types';
export * from './registry';
