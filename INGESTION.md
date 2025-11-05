# Content Ingestion System

## Overview

The content ingestion system allows you to automatically extract links and content from emails (like newsletters) and review them before adding to your collection.

## Architecture

```
Email → Webhook → Parser Registry → Specific Parser → Staging Area → Review → Approve
```

### Key Components:

1. **Parser Interface** (`lib/parsers/types.ts`)
   - Defines the contract all parsers must follow
   - `canHandle()` - Determines if parser can handle the email
   - `parse()` - Extracts items from the email

2. **Parser Registry** (`lib/parsers/registry.ts`)
   - Maintains a list of available parsers
   - Automatically selects the right parser for each email
   - Uses the Strategy Pattern for dynamic parser selection

3. **Ingestion Service** (`lib/ingestion-service.ts`)
   - Coordinates the ingestion process
   - Stores raw emails and extracted items
   - Manages approval workflow

4. **Review UI** (`/admin/ingest`)
   - See all ingested content waiting for review
   - Batch approve/reject items
   - Assign sources to approved items

## Available Parsers

### Benedict Evans Parser
- **File**: `lib/parsers/benedict-evans.ts`
- **Matches**: Emails from Benedict Evans
- **Extracts**: Links, titles, descriptions from newsletter
- **Confidence**: 0.8 (high)

### Generic Parser
- **File**: `lib/parsers/generic.ts`
- **Matches**: Any email (fallback)
- **Extracts**: All links from HTML/text
- **Confidence**: 0.4-0.5 (lower)

## How to Use

### Method 1: Manual Testing (Easiest)

Forward an email to yourself, copy the HTML source, then:

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "from": "sender@example.com",
    "subject": "Newsletter Title",
    "html": "<html>...</html>"
  }'
```

### Method 2: Email Forwarding Service (Production)

Use a service like:
- **SendGrid** Inbound Parse Webhook
- **Mailgun** Routes
- **Postmark** Inbound Webhooks
- **AWS SES** with Lambda

Configure the service to POST to: `https://your-domain.com/api/ingest`

### Method 3: Email-to-Webhook Services

Use a service like:
- **Zapier** - Email by Zapier trigger → Webhook action
- **Make** (Integromat) - Email trigger → HTTP request
- **n8n** - Self-hosted automation

## Workflow

1. **Forward Email**
   - Forward a newsletter to your ingestion email
   - Or POST email data to `/api/ingest`

2. **Automatic Processing**
   - System finds appropriate parser
   - Extracts links and content
   - Stores in staging area

3. **Review**
   - Visit `/admin/ingest`
   - See all extracted items
   - Check titles, URLs, descriptions

4. **Approve/Reject**
   - Select items you want to keep
   - Optionally assign a source
   - Click "Approve" to add to collection
   - Or "Reject" to discard

5. **Added to Collection**
   - Approved items appear in main collection
   - Can still edit/annotate later
   - Tracks that they came from ingestion

## Adding a New Parser

To add a parser for a new newsletter format:

### 1. Create Parser File

`lib/parsers/my-newsletter.ts`:

```typescript
import { ContentParser, IncomingEmail, ParseResult, ExtractedItem } from './types';
import { ContentType } from '@prisma/client';

export class MyNewsletterParser implements ContentParser {
  readonly name = 'my-newsletter';
  readonly description = 'Parser for My Newsletter';

  canHandle(email: IncomingEmail): boolean {
    // Check if this email is from your newsletter
    return email.from.toLowerCase().includes('mynewsletter.com');
  }

  async parse(email: IncomingEmail): Promise<ParseResult> {
    const items: ExtractedItem[] = [];

    // Your parsing logic here
    // Extract links, titles, descriptions from email.html

    return {
      success: true,
      items
    };
  }
}
```

### 2. Register Parser

Add to `lib/parsers/index.ts`:

```typescript
import { MyNewsletterParser } from './my-newsletter';

// Add BEFORE the GenericParser (order matters!)
parserRegistry.register(new MyNewsletterParser());
parserRegistry.register(new GenericParser());
```

### 3. Test

Forward a test email and check `/admin/ingest` to see extracted items.

## API Endpoints

### `POST /api/ingest`
Receive and process an email

**Body:**
```json
{
  "from": "sender@example.com",
  "subject": "Newsletter Title",
  "html": "<html>...</html>",
  "text": "Plain text version"
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "clxxx...",
  "message": "Email received and queued for processing"
}
```

### `GET /api/ingest`
Get all ingestion jobs with their items

**Response:**
```json
[
  {
    "id": "clxxx...",
    "fromEmail": "sender@example.com",
    "subject": "Newsletter",
    "status": "COMPLETED",
    "items": [...]
  }
]
```

### `POST /api/ingest/:jobId/approve`
Approve selected items

**Body:**
```json
{
  "itemIds": ["item1", "item2"],
  "sourceId": "source_id" // optional
}
```

### `POST /api/ingest/:jobId/reject`
Reject selected items

**Body:**
```json
{
  "itemIds": ["item1", "item2"]
}
```

## Database Schema

### IngestionJob
Tracks incoming emails and their processing status

- `fromEmail` - Sender email address
- `subject` - Email subject line
- `rawContent` - Original HTML/text
- `parserType` - Which parser was used
- `status` - PENDING, PROCESSING, COMPLETED, FAILED, APPROVED

### IngestedItem
Individual items extracted from an email

- `title`, `url`, `description`, `type` - Content data
- `suggestedTags` - JSON array of tag suggestions
- `confidence` - How confident the parser is (0-1)
- `status` - PENDING, APPROVED, REJECTED, ADDED

## Programming Concepts

### Strategy Pattern
The parser registry uses the **Strategy Pattern**:
- Multiple "strategies" (parsers) available
- At runtime, choose which strategy to use
- Easy to add new strategies without modifying existing code

### Interface/Contract
All parsers implement the `ContentParser` interface:
- Guarantees they have `canHandle()` and `parse()` methods
- Makes parsers **interchangeable**
- TypeScript ensures you implement all required methods

### Registry Pattern
The `ParserRegistry` maintains available parsers:
- Single source of truth for all parsers
- Iterates through parsers to find a match
- Singleton instance ensures one registry

### Staging Pattern
Items go through a staging area before being added:
- Allows human review
- Can reject unwanted items
- Can bulk approve
- Tracks original source

## Tips

**Parser Confidence:**
- Set higher confidence for specific parsers (0.7-0.9)
- Set lower confidence for generic parsing (0.4-0.6)
- Use confidence to decide if items need review

**Parser Ordering:**
- Register specific parsers first
- Generic parser should be last (it matches everything)
- First matching parser wins

**Error Handling:**
- Parsers should catch errors and return `success: false`
- Jobs marked as FAILED can be re-processed
- Check `errorMessage` field for debugging

**Testing:**
- Start with manual POST requests
- Test with real newsletter HTML
- Check extracted items quality
- Adjust parser logic as needed

## Future Enhancements

- **AI-powered parsing** - Use GPT to extract content
- **Automatic tagging** - Suggest tags based on content
- **Duplicate detection** - Skip items already in collection
- **Scheduled checking** - Poll inbox periodically
- **Browser extension** - Forward from browser
- **Mobile sharing** - Share to ingestion endpoint

## Need Help?

The modular design makes it easy to add new parsers. Look at `benedict-evans.ts` as an example - it shows all the common patterns for parsing newsletters.

Happy ingesting!
