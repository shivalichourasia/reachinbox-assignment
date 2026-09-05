import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "../components/Header";
import { Button } from "../components/Button";
import { ComposeModal } from "../components/ComposeModal";
import { EmailTable } from "../components/EmailTable";
import { Toast } from "../components/Feedback";
import { api } from "../lib/api";
import type { EmailJob, Sender } from "../types";
type Tab = "scheduled" | "sent";
export function DashboardPage() {
  const [tab, setTab] = useState<Tab>("scheduled");
  const [scheduled, setScheduled] = useState<EmailJob[]>([]);
  const [sent, setSent] = useState<EmailJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const loadEmails = useCallback(async () => {
    setLoading(true);
    try {
      const [scheduledRes, sentRes] = await Promise.all([
        api.get<EmailJob[]>("/emails/scheduled"),
        api.get<EmailJob[]>("/emails/sent"),
      ]);
      setScheduled(scheduledRes.data);
      setSent(sentRes.data);
    } catch {
      setToast("Failed to load emails.");
    } finally {
      setLoading(false);
    }
  }, []);
  const loadSenders = useCallback(async () => {
    const res = await api.get<Sender[]>("/senders");
    if (res.data.length === 0) {
      const created = await api.post<Sender>("/senders", {
        name: "Default Sender",
      });
      setSenders([created.data]);
    } else {
      setSenders(res.data);
    }
  }, []);
  const loadSlackStatus = useCallback(async () => {
    const res = await api.get<{ connected: boolean }>("/slack/status");
    setSlackConnected(res.data.connected);
  }, []);
  useEffect(() => {
    loadEmails();
    loadSenders();
    loadSlackStatus();
  }, [loadEmails, loadSenders, loadSlackStatus]);
  useEffect(() => {
    const slackParam = searchParams.get("slack");
    if (slackParam === "connected") setToast("Slack connected successfully.");
    if (slackParam === "error") setToast("Failed to connect Slack.");
    if (slackParam) {
      const timeout = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timeout);
    }
  }, [searchParams]);
  async function handleSlackConnect() {
    const res = await api.get<{ url: string }>("/slack/oauth/authorize");
    window.location.href = res.data.url;
  }
  async function handleSlackDisconnect() {
    await api.post("/slack/disconnect");
    setSlackConnected(false);
  }
  return (
    <div className="min-h-screen bg-slate-50">
      {" "}
      <Header />{" "}
      <main className="mx-auto max-w-5xl px-6 py-8">
        {" "}
        <div className="mb-6 flex items-center justify-between">
          {" "}
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {" "}
            <button
              onClick={() => setTab("scheduled")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === "scheduled" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
            >
              {" "}
              Scheduled Emails{" "}
            </button>{" "}
            <button
              onClick={() => setTab("sent")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === "sent" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
            >
              {" "}
              Sent Emails{" "}
            </button>{" "}
          </div>{" "}
          <div className="flex items-center gap-2">
            {" "}
            <Button
              variant={slackConnected ? "secondary" : "ghost"}
              onClick={
                slackConnected ? handleSlackDisconnect : handleSlackConnect
              }
            >
              {" "}
              {slackConnected ? "Disconnect Slack" : "Connect Slack"}{" "}
            </Button>{" "}
            <Button onClick={() => setComposeOpen(true)}>
              Compose New Email
            </Button>{" "}
          </div>{" "}
        </div>{" "}
        <EmailTable
          jobs={tab === "scheduled" ? scheduled : sent}
          loading={loading}
          mode={tab}
        />{" "}
      </main>{" "}
      <ComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onScheduled={loadEmails}
        senders={senders}
      />{" "}
      {toast && (
        <Toast
          message={toast}
          type={toast.includes("Failed") ? "error" : "success"}
        />
      )}{" "}
    </div>
  );
}
