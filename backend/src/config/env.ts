import "dotenv/config";
function required(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (val === undefined) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return val;
}
export const env = {
  port: parseInt(process.env.PORT ?? "4000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: required("DATABASE_URL"),
  redisHost: process.env.REDIS_HOST ?? "localhost",
  redisPort: parseInt(process.env.REDIS_PORT ?? "6379", 10),
  elasticsearchUrl: process.env.ELASTICSEARCH_URL ?? "http://localhost:9200",
  jwtSecret: required("JWT_SECRET", "dev-secret-change-me"),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleCallbackUrl:
    process.env.GOOGLE_CALLBACK_URL ??
    "http://localhost:4000/api/auth/google/callback",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  slackClientId: process.env.SLACK_CLIENT_ID ?? "",
  slackClientSecret: process.env.SLACK_CLIENT_SECRET ?? "",
  slackRedirectUri:
    process.env.SLACK_REDIRECT_URI ??
    "http://localhost:4000/api/slack/oauth/callback",
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY ?? "5", 10),
  minDelayBetweenEmailsMs: parseInt(
    process.env.MIN_DELAY_BETWEEN_EMAILS_MS ?? "2000",
    10,
  ),
  maxEmailsPerHourGlobal: parseInt(
    process.env.MAX_EMAILS_PER_HOUR ?? "200",
    10,
  ),
  maxEmailsPerHourPerSender: parseInt(
    process.env.MAX_EMAILS_PER_HOUR_PER_SENDER ?? "50",
    10,
  ),
};
