/**
 * Email Parser Utility
 * Handles raw email files (with MIME headers, boundaries, quoted-printable encoding)
 */

import { simpleParser, ParsedMail } from 'mailparser';

export interface ParsedEmail {
  from: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Detect if the input is a raw email file or clean HTML
 */
export function isRawEmail(content: string): boolean {
  // Raw emails start with headers like "Delivered-To:", "Received:", "From:", etc.
  const headerPatterns = [
    /^Delivered-To:/m,
    /^Received:/m,
    /^MIME-Version:/m,
    /^Content-Type:\s*multipart/mi,
    /^--_----------=/m
  ];
  
  return headerPatterns.some(pattern => pattern.test(content.substring(0, 2000)));
}

/**
 * Parse a raw email file and extract components
 */
export async function parseRawEmail(rawEmail: string): Promise<ParsedEmail> {
  const parsed: ParsedMail = await simpleParser(rawEmail);
  
  // Extract 'from' address
  let from = '';
  if (parsed.from?.value?.[0]) {
    from = parsed.from.value[0].address || parsed.from.value[0].name || '';
  }
  
  return {
    from,
    subject: parsed.subject || '',
    html: parsed.html || '',
    text: parsed.text || ''
  };
}