import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { scheduleEmailJob } from "../queue/emailQueue";
import { searchEmailJobs } from "../lib/elasticsearch";
const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
function extractEmailsFromText(text: string): string[] {
  const matches = text.match(EMAIL_REGEX) ?? [];
  return Array.from(new Set(matches.map((e) => e.trim().toLowerCase())));
}
router.post("/parse-leads", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const text = req.file.buffer.toString("utf-8");
  const emails = extractEmailsFromText(text);
  res.json({ count: emails.length, emails });
});
const scheduleSchema = z.object({
  senderId: z.string().uuid(),
  subject: z.string().min(1),
  body: z.string().min(1),
  recipients: z.array(z.string().email()).min(1),
  startTime: z.string().datetime(),
  delayBetweenEmailsMs: z.number().int().positive().optional(),
});
router.post("/schedule", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid payload", details: parsed.error.flatten() });
  }
  const {
    senderId,
    subject,
    body,
    recipients,
    startTime,
    delayBetweenEmailsMs,
  } = parsed.data;
  const sender = await prisma.sender.findFirst({
    where: { id: senderId, userId: req.userId },
  });
  if (!sender) return res.status(404).json({ error: "Sender not found" });
  const batchId = randomUUID();
  const start = new Date(startTime);
  const staggerMs = delayBetweenEmailsMs ?? 0;
  const created = [];
  for (let i = 0; i < recipients.length; i++) {
    const scheduledFor = new Date(start.getTime() + i * staggerMs);
    const emailJob = await prisma.emailJob.create({
      data: {
        userId: req.userId!,
        senderId,
        toAddress: recipients[i],
        subject,
        body,
        scheduledFor,
        batchId,
        status: "SCHEDULED",
      },
    });
    await scheduleEmailJob({ dbEmailJobId: emailJob.id, scheduledFor });
    await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: { status: "QUEUED" },
    });
    created.push(emailJob.id);
  }
  res.status(201).json({ batchId, scheduledCount: created.length });
});
router.get("/scheduled", requireAuth, async (req: AuthedRequest, res) => {
  const jobs = await prisma.emailJob.findMany({
    where: {
      userId: req.userId,
      status: { in: ["SCHEDULED", "QUEUED", "RESCHEDULED"] },
    },
    orderBy: { scheduledFor: "asc" },
    include: { sender: { select: { fromAddress: true } } },
  });
  res.json(jobs);
});
router.get("/sent", requireAuth, async (req: AuthedRequest, res) => {
  const jobs = await prisma.emailJob.findMany({
    where: { userId: req.userId, status: { in: ["SENT", "FAILED"] } },
    orderBy: { sentAt: "desc" },
    include: { sender: { select: { fromAddress: true } } },
  });
  res.json(jobs);
});
router.get("/search", requireAuth, async (req: AuthedRequest, res) => {
  const q = (req.query.q as string) ?? "";
  const results = await searchEmailJobs(req.userId!, q);
  res.json(results);
});
export default router;
