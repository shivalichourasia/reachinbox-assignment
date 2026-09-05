import { Client } from "@elastic/elasticsearch";
import { env } from "../config/env";

export const esClient = new Client({ node: env.elasticsearchUrl });

export const EMAIL_INDEX = "email_jobs";

export async function ensureEmailIndex() {
  const exists = await esClient.indices.exists({ index: EMAIL_INDEX });
  if (!exists) {
    await esClient.indices.create({
      index: EMAIL_INDEX,
      mappings: {
        properties: {
          id: { type: "keyword" },
          userId: { type: "keyword" },
          senderId: { type: "keyword" },
          toAddress: { type: "keyword" },
          subject: { type: "text" },
          body: { type: "text" },
          status: { type: "keyword" },
          scheduledFor: { type: "date" },
          sentAt: { type: "date" },
          batchId: { type: "keyword" },
          createdAt: { type: "date" },
        },
      },
    });
    console.log(`[elasticsearch] created index "${EMAIL_INDEX}"`);
  }
}

export interface IndexableEmailJob {
  id: string;
  userId: string;
  senderId: string;
  toAddress: string;
  subject: string;
  body: string;
  status: string;
  scheduledFor: Date;
  sentAt: Date | null;
  batchId: string;
  createdAt: Date;
}

export async function indexEmailJob(job: IndexableEmailJob) {
  await esClient.index({
    index: EMAIL_INDEX,
    id: job.id,
    document: job,
  });
}

export async function searchEmailJobs(userId: string, query: string) {
  const result = await esClient.search({
    index: EMAIL_INDEX,
    query: {
      bool: {
        filter: [{ term: { userId } }],
        must: query
          ? [
              {
                multi_match: {
                  query,
                  fields: ["subject", "body", "toAddress"],
                },
              },
            ]
          : [{ match_all: {} }],
      },
    },
    sort: [{ createdAt: { order: "desc" } }],
    size: 100,
  });
  return result.hits.hits.map((h) => h._source);
}
