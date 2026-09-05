import { PrismaClient } from "@prisma/client";
declare global {
  var __prisma: PrismaClient | undefined;
}
export const prisma = global.__prisma ?? new PrismaClient();
if (env_is_dev()) {
  global.__prisma = prisma;
}
function env_is_dev() {
  return process.env.NODE_ENV !== "production";
}
