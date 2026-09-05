import { Queue } from "bullmq";
import { redisConnection } from "../lib/redis";
import { env } from "../config/env";
export const EMAIL_QUEUE_NAME = "email-send-queue";
export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { age: 3600 * 24 * 7 },
    removeOnFail: { age: 3600 * 24 * 7 },
    attempts: 5,
    backoff: { type: "exponential", delay: 5000 },
  },
});
export function emailJobIdFor(dbEmailJobId: string) {
  return `email-job-${dbEmailJobId}`;
}
export async function scheduleEmailJob(params: {
  dbEmailJobId: string;
  scheduledFor: Date;
}) {
  const delay = Math.max(0, params.scheduledFor.getTime() - Date.now());
  const jobId = emailJobIdFor(params.dbEmailJobId);
  return emailQueue.add(
    "send-email",
    { dbEmailJobId: params.dbEmailJobId },
    { jobId, delay },
  );
}
