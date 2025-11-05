/**
 * Ingestion Service
 *
 * Handles the processing of ingestion jobs:
 * - Receives email data
 * - Finds appropriate parser
 * - Extracts items
 * - Stores in staging area
 */

import { prisma } from './prisma';
import { parserRegistry, IncomingEmail } from './parsers';
import { IngestionStatus, IngestedItemStatus } from '@prisma/client';

export class IngestionService {
  /**
   * Process an incoming email
   * @param email - The email to process
   * @returns The created ingestion job ID
   */
  async processEmail(email: IncomingEmail): Promise<string> {
    // Create the ingestion job
    const job = await prisma.ingestionJob.create({
      data: {
        fromEmail: email.from,
        subject: email.subject || '',
        rawContent: email.html || email.text || '',
        parserType: 'pending',
        status: 'PENDING'
      }
    });

    // Process in background (or could use a queue)
    this.processJob(job.id).catch(error => {
      console.error(`[IngestionService] Error processing job ${job.id}:`, error);
    });

    return job.id;
  }

  /**
   * Process a specific ingestion job
   * @param jobId - The job ID to process
   */
  async processJob(jobId: string): Promise<void> {
    try {
      // Update status to processing
      await prisma.ingestionJob.update({
        where: { id: jobId },
        data: { status: 'PROCESSING' }
      });

      // Get the job
      const job = await prisma.ingestionJob.findUnique({
        where: { id: jobId }
      });

      if (!job) {
        throw new Error('Job not found');
      }

      // Reconstruct email object
      const email: IncomingEmail = {
        from: job.fromEmail,
        subject: job.subject || undefined,
        html: job.rawContent
      };

      // Find a parser that can handle this email
      const parser = parserRegistry.findParser(email);

      if (!parser) {
        throw new Error('No parser found for this email');
      }

      // Update parser type
      await prisma.ingestionJob.update({
        where: { id: jobId },
        data: { parserType: parser.name }
      });

      // Parse the email
      const result = await parser.parse(email);

      if (!result.success) {
        throw new Error(result.error || 'Parsing failed');
      }

      // Create ingested items
      for (const item of result.items) {
        await prisma.ingestedItem.create({
          data: {
            jobId: job.id,
            title: item.title,
            url: item.url,
            description: item.description,
            type: item.type,
            suggestedTags: item.suggestedTags ? JSON.stringify(item.suggestedTags) : null,
            confidence: item.confidence,
            status: 'PENDING'
          }
        });
      }

      // Mark job as completed
      await prisma.ingestionJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          processedAt: new Date()
        }
      });

      console.log(`[IngestionService] Successfully processed job ${jobId}, extracted ${result.items.length} items`);
    } catch (error) {
      console.error(`[IngestionService] Error processing job ${jobId}:`, error);

      // Mark job as failed
      await prisma.ingestionJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          processedAt: new Date()
        }
      });
    }
  }

  /**
   * Approve and add items to main collection
   * @param itemIds - Array of ingested item IDs to approve
   * @param sourceId - Optional source ID to associate with items
   */
  async approveItems(itemIds: string[], sourceId?: string): Promise<void> {
    for (const itemId of itemIds) {
      const item = await prisma.ingestedItem.findUnique({
        where: { id: itemId }
      });

      if (!item || item.status !== 'PENDING') {
        continue;
      }

      // Create the content item
      const contentItem = await prisma.contentItem.create({
        data: {
          title: item.title,
          url: item.url,
          description: item.description,
          type: item.type,
          sourceId: sourceId || null
        }
      });

      // Update ingested item
      await prisma.ingestedItem.update({
        where: { id: itemId },
        data: {
          status: 'ADDED',
          contentItemId: contentItem.id
        }
      });
    }

    // Check if all items in the job are processed
    const item = await prisma.ingestedItem.findUnique({
      where: { id: itemIds[0] },
      include: { job: { include: { items: true } } }
    });

    if (item) {
      const allProcessed = item.job.items.every(
        i => i.status === 'ADDED' || i.status === 'REJECTED'
      );

      if (allProcessed) {
        await prisma.ingestionJob.update({
          where: { id: item.jobId },
          data: { status: 'APPROVED' }
        });
      }
    }
  }

  /**
   * Reject items (mark as not wanted)
   * @param itemIds - Array of ingested item IDs to reject
   */
  async rejectItems(itemIds: string[]): Promise<void> {
    await prisma.ingestedItem.updateMany({
      where: { id: { in: itemIds } },
      data: { status: 'REJECTED' }
    });
  }
}

export const ingestionService = new IngestionService();
