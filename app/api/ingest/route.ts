/**
 * Ingestion API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { ingestionService } from '@/lib/ingestion-service';
import { isRawEmail, parseRawEmail } from '@/lib/email-parser';
import '@/lib/parsers';

/**
 * POST /api/ingest
 * Receive and process an email
 *
 * Body format:
 * {
 *   from: "sender@example.com",
 *   subject: "Newsletter Title",
 *   html: "<html>...</html>",
 *   text: "Plain text version..."
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { from, subject, html, text } = body;

    // Check if 'html' field contains a raw email file
    if (html && isRawEmail(html)) {
      console.log('[Ingest API] Detected raw email, parsing...');
      const parsed = await parseRawEmail(html);
      from = parsed.from || from;
      subject = parsed.subject || subject;
      html = parsed.html;
      text = parsed.text;
      console.log('[Ingest API] Parsed email from:', from, 'subject:', subject);
    }

    if (!from) {
      return NextResponse.json(
        { error: 'Missing required field: from' },
        { status: 400 }
      );
    }

    const jobId = await ingestionService.processEmail({
      from,
      subject,
      html,
      text
    });

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Email received and queued for processing'
    }, { status: 201 });
  } catch (error) {
    console.error('[Ingest API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process email' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ingest
 * Get all ingestion jobs with their items
 */
export async function GET() {
  try {
    const jobs = await import('@/lib/prisma').then(m => m.prisma.ingestionJob.findMany({
      include: {
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    }));

    return NextResponse.json(jobs);
  } catch (error) {
    console.error('[Ingest API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ingestion jobs' },
      { status: 500 }
    );
  }
}