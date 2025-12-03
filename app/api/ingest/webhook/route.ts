/**
 * Email Webhook Endpoint
 * 
 * Receives forwarded emails from:
 * - Google Apps Script (recommended for Gmail without custom domain)
 * - SendGrid Inbound Parse
 * - Mailgun Routes
 * - Postmark Inbound
 * 
 * Setup: Set INGEST_WEBHOOK_SECRET in your Vercel environment variables
 */

import { NextRequest, NextResponse } from 'next/server';
import { ingestionService } from '@/lib/ingestion-service';
import '@/lib/parsers';

// Webhook secret for authentication
const WEBHOOK_SECRET = process.env.INGEST_WEBHOOK_SECRET;

/**
 * Verify the webhook request is authentic
 */
function verifyWebhook(request: NextRequest): boolean {
  // If no secret is configured, reject all requests in production
  if (!WEBHOOK_SECRET) {
    console.warn('[Webhook] No INGEST_WEBHOOK_SECRET configured');
    // Allow in development, reject in production
    return process.env.NODE_ENV === 'development';
  }

  // Check Authorization header (Bearer token - used by Google Apps Script)
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const [type, credentials] = authHeader.split(' ');
    if (type === 'Bearer' && credentials === WEBHOOK_SECRET) {
      return true;
    }
    if (type === 'Basic') {
      const decoded = Buffer.from(credentials, 'base64').toString();
      const [, password] = decoded.split(':');
      if (password === WEBHOOK_SECRET) {
        return true;
      }
    }
  }

  // Check custom header (Google Apps Script also sends this)
  const customSecret = request.headers.get('x-webhook-secret');
  if (customSecret === WEBHOOK_SECRET) {
    return true;
  }

  // Check query parameter (fallback for services that don't support headers)
  const url = new URL(request.url);
  const querySecret = url.searchParams.get('secret');
  if (querySecret === WEBHOOK_SECRET) {
    return true;
  }

  return false;
}

/**
 * Normalize email data from different providers
 */
function normalizeEmailData(data: Record<string, unknown>): { 
  from: string; 
  subject: string; 
  html?: string; 
  text?: string 
} | null {
  
  // Google Apps Script / Direct JSON format (most common for us)
  if (data.from && data.subject !== undefined) {
    return {
      from: String(data.from),
      subject: String(data.subject || ''),
      html: data.html ? String(data.html) : undefined,
      text: data.text ? String(data.text) : undefined
    };
  }

  // SendGrid format
  if (data.envelope || (data.from && data.html)) {
    return {
      from: String(data.from || ''),
      subject: String(data.subject || ''),
      html: data.html ? String(data.html) : undefined,
      text: data.text ? String(data.text) : undefined
    };
  }

  // Mailgun format
  if (data.sender || data['body-html']) {
    return {
      from: String(data.sender || data.from || ''),
      subject: String(data.subject || ''),
      html: data['body-html'] ? String(data['body-html']) : 
            data['stripped-html'] ? String(data['stripped-html']) : undefined,
      text: data['body-plain'] ? String(data['body-plain']) : undefined
    };
  }

  // Postmark format
  if (data.From && data.HtmlBody !== undefined) {
    return {
      from: String(data.From),
      subject: String(data.Subject || ''),
      html: data.HtmlBody ? String(data.HtmlBody) : undefined,
      text: data.TextBody ? String(data.TextBody) : undefined
    };
  }

  return null;
}

/**
 * POST /api/ingest/webhook
 * Receive emails from webhook services or Google Apps Script
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[Webhook] Received request');

  // Verify authentication
  if (!verifyWebhook(request)) {
    console.error('[Webhook] Authentication failed');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    let data: Record<string, unknown>;
    
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // Parse JSON (Google Apps Script, Postmark, custom)
      data = await request.json();
      console.log('[Webhook] Parsed JSON, keys:', Object.keys(data));
    } else if (contentType.includes('multipart/form-data')) {
      // Parse multipart form data (SendGrid, Mailgun)
      const formData = await request.formData();
      data = {};
      formData.forEach((value, key) => {
        data[key] = typeof value === 'string' ? value : value.toString();
      });
      console.log('[Webhook] Parsed form data, keys:', Object.keys(data));
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // Parse URL-encoded form data
      const text = await request.text();
      data = Object.fromEntries(new URLSearchParams(text));
      console.log('[Webhook] Parsed URL-encoded, keys:', Object.keys(data));
    } else {
      // Try JSON as fallback
      try {
        data = await request.json();
        console.log('[Webhook] Parsed as JSON fallback');
      } catch {
        console.error('[Webhook] Could not parse body, content-type:', contentType);
        return NextResponse.json(
          { error: 'Could not parse request body' },
          { status: 400 }
        );
      }
    }

    // Normalize the email data
    const emailData = normalizeEmailData(data);
    
    if (!emailData || !emailData.from) {
      console.error('[Webhook] Could not extract email data from payload');
      console.error('[Webhook] Received data:', JSON.stringify(data).substring(0, 500));
      return NextResponse.json(
        { error: 'Could not parse email data' },
        { status: 400 }
      );
    }

    console.log('[Webhook] Processing email:');
    console.log('  From:', emailData.from);
    console.log('  Subject:', emailData.subject);
    console.log('  Has HTML:', !!emailData.html);
    console.log('  Has Text:', !!emailData.text);

    // Process through ingestion service
    const jobId = await ingestionService.processEmail({
      from: emailData.from,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text
    });

    const duration = Date.now() - startTime;
    console.log(`[Webhook] Created job ${jobId} in ${duration}ms`);

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Email received and queued for processing'
    }, { status: 201 });

  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process email' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ingest/webhook
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Email webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}