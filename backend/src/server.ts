import express from "express";
import cors from "cors";
import { env } from "./config/env";
import authRoutes from "./routes/auth";
import emailRoutes from "./routes/emails";
import senderRoutes from "./routes/senders";
import slackRoutes from "./routes/slack";
import { setupBullBoard } from "./queue/bullBoard";
import { ensureEmailIndex } from "./lib/elasticsearch";
import { reconcilePendingJobs } from "./queue/reconcile";

async function main() {
  const app = express();

  app.use(cors({ origin: env.frontendUrl, credentials: true }));
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRoutes);
  app.use("/api/emails", emailRoutes);
  app.use("/api/senders", senderRoutes);
  app.use("/api/slack", slackRoutes);

  const bullBoardAdapter = setupBullBoard();
  app.use("/admin/queues", bullBoardAdapter.getRouter());

  await ensureEmailIndex();
  await reconcilePendingJobs();

  app.listen(env.port, () => {
    console.log(`[server] API listening on http://localhost:${env.port}`);
    console.log(`[server] BullMQ dashboard at http://localhost:${env.port}/admin/queues`);
  });
}

main().catch((err) => {
  console.error("[server] fatal startup error:", err);
  process.exit(1);
});
