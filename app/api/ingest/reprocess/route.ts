/**
 * Reprocess Stuck Ingestion Jobs
 * 
 * This endpoint finds jobs that are stuck in PENDING or PROCESSING status
 * and re-runs the processing logic with the rawContent already stored
 * in the database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ingestionService } from '@/lib/ingestion-service';

export async function POST(request: NextRequest) {
  try {
    // Parse request body - might contain specific job IDs
    const body = await request.json().catch(() => ({}));
    const { jobIds } = body;

    // Find jobs to reprocess
    let jobsToProcess;
    
    if (jobIds && Array.isArray(jobIds) && jobIds.length > 0) {
      // Reprocess specific jobs
      jobsToProcess = await prisma.ingestionJob.findMany({
        where: {
          id: { in: jobIds }
        }
      });
    } else {
      // Find all stuck jobs (PENDING or PROCESSING)
      jobsToProcess = await prisma.ingestionJob.findMany({
        where: {
          status: { in: ['PENDING', 'PROCESSING'] }
        }
      });
    }

    // Check if we found any jobs
    if (jobsToProcess.length === 0) {
      return NextResponse.json({
        message: 'No jobs found to reprocess',
        reprocessed: 0
      });
    }

    // Track results
    const results: Array<{
      jobId: string;
      success: boolean;
      error?: string;
      itemCount?: number;
    }> = [];

    // Process each job
    for (const job of jobsToProcess) {
      // First, reset the job status to PENDING so processJob can run properly
      await prisma.ingestionJob.update({
        where: { id: job.id },
        data: { status: 'PENDING' }
      });

      // Delete any existing partial items from previous failed attempts
      await prisma.ingestedItem.deleteMany({
        where: { jobId: job.id }
      });

      try {
        // Re-run the processing
        await ingestionService.processJob(job.id);
        
        // Count items created
        const itemCount = await prisma.ingestedItem.count({
          where: { jobId: job.id }
        });
        
        results.push({
          jobId: job.id,
          success: true,
          itemCount
        });
      } catch (error) {
        results.push({
          jobId: job.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Return summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    return NextResponse.json({
      message: `Reprocessed ${successful} jobs successfully, ${failed} failed`,
      results
    });

  } catch (error) {
    console.error('Error in reprocess endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to reprocess jobs' },
      { status: 500 }
    );
  }
}