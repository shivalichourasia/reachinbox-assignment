import { prisma } from "../lib/prisma";
import { emailQueue, emailJobIdFor, scheduleEmailJob } from "./emailQueue";
export async function reconcilePendingJobs() {
  const pending = await prisma.emailJob.findMany({
    where: { status: { in: ["SCHEDULED", "QUEUED", "RESCHEDULED"] } },
  });
  let reQueued = 0;
  for (const job of pending) {
    const bullJobId = emailJobIdFor(job.id);
    const existing = await emailQueue.getJob(bullJobId);
    if (existing) {
      continue;
    }
    await scheduleEmailJob({
      dbEmailJobId: job.id,
      scheduledFor: job.scheduledFor,
    });
    await prisma.emailJob.update({
      where: { id: job.id },
      data: { status: "QUEUED" },
    });
    reQueued++;
  }
  if (reQueued > 0) {
    console.log(
      `[reconcile] re-queued ${reQueued} job(s) missing from BullMQ after restart.`,
    );
  } else {
    console.log(
      `[reconcile] all ${pending.length} pending job(s) already present in queue.`,
    );
  }
}
