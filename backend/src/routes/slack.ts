import { Router } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import {
  buildSlackAuthorizeUrl,
  exchangeSlackCode,
  saveSlackIntegration,
  disconnectSlack,
} from "../services/slack";
import { prisma } from "../lib/prisma";
const router = Router();
router.get("/oauth/authorize", requireAuth, (req: AuthedRequest, res) => {
  res.json({ url: buildSlackAuthorizeUrl(req.userId!) });
});
router.get("/oauth/callback", async (req, res) => {
  const code = req.query.code as string | undefined;
  const userId = req.query.state as string | undefined;
  if (!code || !userId) {
    return res.redirect(`${env.frontendUrl}/dashboard?slack=error`);
  }
  try {
    const tokenData = await exchangeSlackCode(code);
    await saveSlackIntegration(userId, tokenData);
    res.redirect(`${env.frontendUrl}/dashboard?slack=connected`);
  } catch (err) {
    console.error("[slack] OAuth callback failed:", err);
    res.redirect(`${env.frontendUrl}/dashboard?slack=error`);
  }
});
router.get("/status", requireAuth, async (req: AuthedRequest, res) => {
  const integration = await prisma.slackIntegration.findUnique({
    where: { userId: req.userId },
  });
  res.json({
    connected: !!integration,
    teamName: integration?.teamName ?? null,
  });
});
router.post("/disconnect", requireAuth, async (req: AuthedRequest, res) => {
  await disconnectSlack(req.userId!);
  res.json({ ok: true });
});
export default router;
