import { env } from "../config/env";
import { redisConnection } from "../lib/redis";

export function currentHourWindow(date: Date = new Date()): string {
  return date.toISOString().slice(0, 13);
}

export function nextHourBoundary(date: Date = new Date()): Date {
  const next = new Date(date);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(next.getUTCHours() + 1);
  return next;
}

function globalKey(hourWindow: string) {
  return `ratelimit:global:${hourWindow}`;
}

function senderKey(senderId: string, hourWindow: string) {
  return `ratelimit:sender:${senderId}:${hourWindow}`;
}

export async function wouldExceedLimit(senderId: string): Promise<boolean> {
  const hourWindow = currentHourWindow();
  const [globalCount, senderCount] = await Promise.all([
    redisConnection.get(globalKey(hourWindow)),
    redisConnection.get(senderKey(senderId, hourWindow)),
  ]);
  const global = globalCount ? parseInt(globalCount, 10) : 0;
  const sender = senderCount ? parseInt(senderCount, 10) : 0;
  return (
    global >= env.maxEmailsPerHourGlobal ||
    sender >= env.maxEmailsPerHourPerSender
  );
}

export async function recordSend(
  senderId: string,
): Promise<{ global: number; sender: number }> {
  const hourWindow = currentHourWindow();
  const globalKeyName = globalKey(hourWindow);
  const senderKeyName = senderKey(senderId, hourWindow);
  const pipeline = redisConnection.pipeline();
  pipeline.incr(globalKeyName);
  pipeline.expire(globalKeyName, 3700);
  pipeline.incr(senderKeyName);
  pipeline.expire(senderKeyName, 3700);
  const results = await pipeline.exec();
  return {
    global: (results?.[0]?.[1] as number) ?? 0,
    sender: (results?.[2]?.[1] as number) ?? 0,
  };
}

export async function isSenderAtLimit(senderId: string): Promise<boolean> {
  const count = await redisConnection.get(
    senderKey(senderId, currentHourWindow()),
  );
  return (count ? parseInt(count, 10) : 0) >= env.maxEmailsPerHourPerSender;
}
