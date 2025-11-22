# Email Ingestion Guide

This guide explains how to ingest Benedict Evans newsletters (or other email content) into your content curation platform.

## Quick Start: Manual Testing

The easiest way to test the newsletter parser right now is using the built-in test interface:

### Step-by-Step:

1. **Navigate to the test interface**
   - Go to: `http://localhost:3000/admin/test-ingest`
   - Or click "🧪 Test Newsletter Parser" button on the admin dashboard

2. **Get the newsletter HTML**
   - Open a Benedict Evans newsletter in your email
   - Click "View in browser" (if available - this gives cleaner HTML)
   - Right-click anywhere on the page
   - Select "View Page Source" (or press `Ctrl+U` on Windows/Linux, `Cmd+Option+U` on Mac)
   - Select all (`Ctrl+A` / `Cmd+A`)
   - Copy (`Ctrl+C` / `Cmd+C`)

3. **Submit for processing**
   - Paste the HTML into the textarea
   - Click "Process Newsletter"
   - You'll be redirected to `/admin/ingest` to review the extracted items

4. **Review and approve**
   - You'll see all extracted items with:
     - Category badges (News, Ideas, Outside Interests, Data)
     - Benedict's commentary in blue callout boxes
     - Suggested tags
     - Confidence scores
   - Select items you want to add
   - Choose a source (optional)
   - Click "Approve" to add them to your main content collection

## Production Setup: Email Forwarding

For automatic ingestion when you receive newsletters, you'll need to set up email forwarding to a webhook. Here are several options:

### Option 1: Zapier (Easiest, No Code)

**Pros**: Simple setup, no server code needed
**Cons**: Paid service for unlimited emails

1. **Create a Zapier account** (free tier works for testing)

2. **Create a new Zap**:
   - Trigger: "Email by Zapier"
   - Set up a forwarding address (e.g., `parse@robot.zapier.com`)

3. **Add action: "Webhooks by Zapier"**:
   - Action: POST
   - URL: `https://your-domain.com/api/ingest`
   - Payload Type: JSON
   - Data:
     ```json
     {
       "from": "{{from_email}}",
       "subject": "{{subject}}",
       "html": "{{body_html}}"
     }
     ```

4. **Forward newsletters**:
   - Forward Benedict Evans newsletters to your Zapier email address
   - Zapier will automatically POST to your ingestion endpoint

### Option 2: Mailgun (Developer-Friendly)

**Pros**: Free tier (10,000 emails/month), powerful API
**Cons**: Requires DNS setup

1. **Sign up for Mailgun** (https://www.mailgun.com)

2. **Set up a domain** (or use their sandbox domain for testing)

3. **Create a route**:
   - Match recipient: `ingest@your-domain.com`
   - Forward to: `https://your-domain.com/api/ingest/mailgun`

4. **Create webhook endpoint** (`app/api/ingest/mailgun/route.ts`):
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';

   export async function POST(request: NextRequest) {
     const formData = await request.formData();

     const from = formData.get('from') as string;
     const subject = formData.get('subject') as string;
     const html = formData.get('body-html') as string;

     // Forward to main ingest endpoint
     const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/ingest`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ from, subject, html })
     });

     return NextResponse.json({ success: true });
   }
   ```

5. **Forward newsletters**:
   - Forward to: `ingest@your-domain.com`

### Option 3: SendGrid Inbound Parse

**Pros**: Free tier (100 emails/day), reliable
**Cons**: Requires DNS MX record setup

1. **Sign up for SendGrid** (https://sendgrid.com)

2. **Set up Inbound Parse**:
   - Go to Settings > Inbound Parse
   - Add your domain and subdomain (e.g., `ingest.your-domain.com`)
   - Add MX record to your DNS

3. **Configure webhook**:
   - URL: `https://your-domain.com/api/ingest/sendgrid`
   - Create endpoint similar to Mailgun example above

4. **Forward newsletters**:
   - Forward to: `newsletter@ingest.your-domain.com`

### Option 4: Custom Email Server (Advanced)

If you want full control, you can set up your own email server:

1. **Use a library like `node-imap`** to connect to an email account
2. **Poll for new emails** on a schedule (cron job)
3. **Extract HTML and POST to `/api/ingest`**

This is more complex but gives you complete control.

## API Reference

### POST /api/ingest

Ingests newsletter content and creates an ingestion job.

**Request Body**:
```json
{
  "from": "benedict@ben-evans.com",
  "subject": "Benedict Evans Newsletter - January 2025",
  "html": "<html>...</html>"
}
```

**Response**:
```json
{
  "success": true,
  "job": {
    "id": "clx...",
    "status": "COMPLETED",
    "parserType": "BenedictEvansParser"
  },
  "itemCount": 15
}
```

**Error Response**:
```json
{
  "error": "No suitable parser found for this email"
}
```

## Testing Different Newsletter Formats

The parser system is modular, so you can add parsers for other newsletters:

1. **Create a new parser** in `lib/parsers/` (see `PARSER-GUIDE.md`)
2. **Register it** in `lib/parsers/index.ts`
3. **Test it** using the test interface at `/admin/test-ingest`

## Troubleshooting

### No items extracted
- Check that the HTML contains the expected structure
- View the ingestion job in `/admin/ingest` to see error messages
- Try using "View in browser" instead of copying directly from email client

### Wrong parser selected
- Parsers are selected based on `canHandle()` method
- Check the `fromEmail` matches the parser's expected sender
- You can specify parser priority in the registry

### HTML encoding issues
- Some email clients encode HTML entities differently
- The Benedict Evans parser handles quoted-printable encoding
- You may need to add additional cleaning in your parser

### Confidence scores too low
- Parsers assign confidence scores (0-1) based on how well they matched
- Low confidence means the structure didn't match expectations
- Review the parser's pattern matching logic

## Next Steps

Once you have email ingestion working:

1. **Create more parsers** for other newsletters you subscribe to
2. **Set up automatic source assignment** based on sender
3. **Add deduplication** to avoid ingesting the same item twice
4. **Create filters** to auto-approve certain items
5. **Add email notifications** when new items need review

## Tips for Benedict Evans Newsletters

- His newsletters come out weekly, usually on Sundays
- Categories are consistent: News, Ideas, Outside Interests, Data
- "View in browser" link is at the top - use this for cleanest HTML
- Each newsletter has 15-25 items typically
- His commentary is the most valuable part - that's why we extract `authorNote`

## Security Considerations

When setting up email forwarding:

1. **Validate sender** - Only accept from trusted addresses
2. **Rate limiting** - Prevent abuse of your ingestion endpoint
3. **Authentication** - Add API key or webhook signing
4. **Sanitize HTML** - Be careful with user-generated content

Example rate limiting (add to `/api/ingest/route.ts`):
```typescript
import { ratelimit } from '@/lib/ratelimit'; // Use Upstash or similar

export async function POST(request: NextRequest) {
  const ip = request.ip ?? 'unknown';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // ... rest of ingestion logic
}
```

## Questions?

If you run into issues:
- Check the browser console for errors
- Review ingestion jobs at `/admin/ingest`
- Look at the parser test script: `node test-benedict-parser.js`
- Check the comprehensive docs in `INGESTION.md` and `PARSER-GUIDE.md`
