export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface Sender {
  id: string;
  name: string;
  fromAddress: string;
  createdAt: string;
}

export type EmailStatus =
  | "SCHEDULED"
  | "QUEUED"
  | "SENDING"
  | "SENT"
  | "FAILED"
  | "RESCHEDULED";

export interface EmailJob {
  id: string;
  toAddress: string;
  subject: string;
  body: string;
  scheduledFor: string;
  sentAt: string | null;
  status: EmailStatus;
  sender?: { fromAddress: string };
}
