import { Router } from "express";
import nodemailer from "nodemailer";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
const router = Router();
router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const senders = await prisma.sender.findMany({
    where: { userId: req.userId },
    select: { id: true, name: true, fromAddress: true, createdAt: true },
  });
  res.json(senders);
});
router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const { name } = req.body as { name?: string };
  try {
    const testAccount = await nodemailer.createTestAccount();
    const sender = await prisma.sender.create({
      data: {
        userId: req.userId!,
        name: name?.trim() || testAccount.user,
        fromAddress: testAccount.user,
        smtpUser: testAccount.user,
        smtpPass: testAccount.pass,
        smtpHost: testAccount.smtp.host,
        smtpPort: testAccount.smtp.port,
      },
    });
    res.status(201).json(sender);
  } catch (err) {
    console.error("[senders] failed to create Ethereal account:", err);
    res.status(502).json({ error: "Failed to create Ethereal SMTP account" });
  }
});
export default router;
