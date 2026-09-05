import { DelayedError, Job, Worker } from "bullmq";
import { env } from "../config/env";
import { indexEmailJob } from "../lib/elasticsearch";
import { prisma } from "../lib/prisma";
import { redisConnection } from "../lib/redis";
import { sendMail } from "../services/mailer";
import {
  nextHourBoundary,
  recordSend,
  wouldExceedLimit,
} from "../services/rateLimiter";
import { notifyRateLimitHit } from "../services/slack";
import { EMAIL_QUEUE_NAME } from "./emailQueue";

interface EmailJobData {
  dbEmailJobId: string;
}

export function startEmailWorker() {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>, token) => {
      const { dbEmailJobId } = job.data;
      const emailJob = await prisma.emailJob.findUnique({
        where: { id: dbEmailJobId },
        include: { sender: true },
      });

      if (!emailJob) {
        console.warn(
          `[worker] EmailJob ${dbEmailJobId} not found in DB, skipping.`,
        );
        return;
      }
      if (emailJob.status === "SENT") {
        console.log(
          `[worker] ${dbEmailJobId} already SENT, skipping duplicate.`,
        );
        return;
      }

      if (await wouldExceedLimit(emailJob.senderId)) {
        const nextWindow = nextHourBoundary();
        console.log(
          `[worker] rate limit hit for sender ${emailJob.senderId}, rescheduling to ${nextWindow.toISOString()}`,
        );
        await prisma.emailJob.update({
          where: { id: dbEmailJobId },
          data: { status: "RESCHEDULED", scheduledFor: nextWindow },
        });
        await notifyRateLimitHit(
          emailJob.userId,
          `:warning: Hourly send limit reached for sender *${emailJob.sender.fromAddress}*. ` +
            `Remaining emails are being rescheduled to the next hour window (${nextWindow.toISOString()}).`,
        );
        await job.moveToDelayed(nextWindow.getTime(), token);
        throw new DelayedError();
      }

      await prisma.emailJob.update({
        where: { id: dbEmailJobId },
        data: { status: "SENDING", attempts: { increment: 1 } },
      });

      try {
        const { previewUrl } = await sendMail(
          {
            smtpHost: emailJob.sender.smtpHost,
            smtpPort: emailJob.sender.smtpPort,
            smtpUser: emailJob.sender.smtpUser,
            smtpPass: emailJob.sender.smtpPass,
            fromAddress: emailJob.sender.fromAddress,
          },
          {
            to: emailJob.toAddress,
            subject: emailJob.subject,
            html: emailJob.body,
          },
        );
        const updated = await prisma.emailJob.update({
          where: { id: dbEmailJobId },
          data: { status: "SENT", sentAt: new Date(), lastError: null },
        });
        await recordSend(emailJob.senderId);
        await indexEmailJob(updated);
        console.log(
          `[worker] sent ${dbEmailJobId} to ${emailJob.toAddress}. Preview: ${previewUrl}`,
        );
      } catch (err: any) {
        const updated = await prisma.emailJob.update({
          where: { id: dbEmailJobId },
          data: { status: "FAILED", lastError: String(err?.message ?? err) },
        });
        await indexEmailJob(updated);
        throw err;
      }
    },
    {
      connection: redisConnection,
      concurrency: env.workerConcurrency,
      limiter: { max: 1, duration: env.minDelayBetweenEmailsMs },
    },
  );

  worker.on("failed", (job, err) =>
    console.error(`[worker] job ${job?.id} failed:`, err.message),
  );
  worker.on("completed", (job) =>
    console.log(`[worker] job ${job.id} completed`),
  );
  return worker;
}
