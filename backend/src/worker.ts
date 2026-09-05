import { startEmailWorker } from "./queue/emailWorker";
import { reconcilePendingJobs } from "./queue/reconcile";
import { env } from "./config/env";
async function main() {
  await reconcilePendingJobs();
  const worker = startEmailWorker();
  console.log(
    `[worker] started with concurrency=${env.workerConcurrency}, ` +
      `min delay=${env.minDelayBetweenEmailsMs}ms between sends`,
  );
  const shutdown = async () => {
    console.log("[worker] shutting down gracefully...");
    await worker.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
main().catch((err) => {
  console.error("[worker] fatal startup error:", err);
  process.exit(1);
});
