import IORedis from "ioredis";
import { env } from "../config/env";
export const redisConnection = new IORedis({
  host: env.redisHost,
  port: env.redisPort,
  maxRetriesPerRequest: null,
});
redisConnection.on("error", (err) => {
  console.error("[redis] connection error:", err.message);
});
