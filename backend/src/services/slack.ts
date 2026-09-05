import { prisma } from "../lib/prisma";
import { env } from "../config/env";
export function buildSlackAuthorizeUrl(userId: string) {
  const params = new URLSearchParams({
    client_id: env.slackClientId,
    scope: "incoming-webhook,chat:write",
    redirect_uri: env.slackRedirectUri,
    state: userId,
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}
export async function exchangeSlackCode(code: string) {
  const resp = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.slackClientId,
      client_secret: env.slackClientSecret,
      code,
      redirect_uri: env.slackRedirectUri,
    }),
  });
  const data = (await resp.json()) as {
    ok: boolean;
    error?: string;
    access_token?: string;
    incoming_webhook?: { url?: string };
    team?: { name?: string };
  };
  if (!data.ok) {
    throw new Error(`Slack OAuth failed: ${data.error}`);
  }
  return {
    accessToken: data.access_token as string,
    webhookUrl: data.incoming_webhook?.url as string,
    teamName: data.team?.name,
  };
}
export async function saveSlackIntegration(
  userId: string,
  tokenData: { accessToken: string; webhookUrl: string; teamName?: string },
) {
  return prisma.slackIntegration.upsert({
    where: { userId },
    update: {
      accessToken: tokenData.accessToken,
      webhookUrl: tokenData.webhookUrl,
      teamName: tokenData.teamName,
    },
    create: {
      userId,
      accessToken: tokenData.accessToken,
      webhookUrl: tokenData.webhookUrl,
      teamName: tokenData.teamName,
    },
  });
}
export async function disconnectSlack(userId: string) {
  await prisma.slackIntegration.deleteMany({ where: { userId } });
}
export async function notifyRateLimitHit(userId: string, message: string) {
  const integration = await prisma.slackIntegration.findUnique({
    where: { userId },
  });
  if (!integration) {
    console.log(
      `[slack] user ${userId} has no Slack connected, skipping notify`,
    );
    return;
  }
  try {
    const resp = await fetch(integration.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });
    if (!resp.ok) {
      console.error(
        `[slack] webhook call failed: ${resp.status} ${await resp.text()}`,
      );
    }
  } catch (err) {
    console.error("[slack] failed to send notification:", err);
  }
}
