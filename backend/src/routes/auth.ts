import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
const router = Router();
const oauthClient = new OAuth2Client(
  env.googleClientId,
  env.googleClientSecret,
  env.googleCallbackUrl,
);
router.get("/google", (req, res) => {
  const url = oauthClient.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    prompt: "consent",
  });
  res.redirect(url);
});
router.get("/google/callback", async (req, res) => {
  const code = req.query.code as string | undefined;
  if (!code) {
    return res.redirect(`${env.frontendUrl}/login?error=missing_code`);
  }
  try {
    const { tokens } = await oauthClient.getToken(code);
    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: env.googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new Error("Incomplete Google profile payload");
    }
    const user = await prisma.user.upsert({
      where: { googleId: payload.sub },
      update: { name: payload.name ?? "Unknown", avatarUrl: payload.picture },
      create: {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name ?? "Unknown",
        avatarUrl: payload.picture,
      },
    });
    const token = jwt.sign({ userId: user.id }, env.jwtSecret, {
      expiresIn: "7d",
    });
    res.redirect(`${env.frontendUrl}/auth/callback?token=${token}`);
  } catch (err) {
    console.error("[auth] Google OAuth callback failed:", err);
    res.redirect(`${env.frontendUrl}/login?error=oauth_failed`);
  }
});
router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
  });
});
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});
export default router;
