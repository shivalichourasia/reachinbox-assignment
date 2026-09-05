import { useState } from "react";
import { Modal } from "./Modal";
import { Input, Textarea } from "./Input";
import { Button } from "./Button";
import { api } from "../lib/api";
import type { Sender } from "../types";

interface ComposeModalProps {
  open: boolean;
  onClose: () => void;
  onScheduled: () => void;
  senders: Sender[];
}

function defaultStartTime(minutesFromNow: number): string {
  const d = new Date(Date.now() + minutesFromNow * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function ComposeModal({ open, onClose, onScheduled, senders }: ComposeModalProps) {
  const [senderId, setSenderId] = useState(senders[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [startTime, setStartTime] = useState(() => defaultStartTime(2));
  const [delayMs, setDelayMs] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState(50);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(f: File | null) {
    setFile(f);
    setRecipients([]);
    if (!f) return;
    setParsing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", f);
      const res = await api.post("/emails/parse-leads", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setRecipients(res.data.emails);
    } catch {
      setError("Failed to parse the uploaded file.");
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit() {
    const missing: string[] = [];
    if (!senderId) missing.push("sender");
    if (!subject) missing.push("subject");
    if (!body) missing.push("body");
    if (recipients.length === 0) missing.push("leads file");
    if (!startTime) missing.push("start time");
    if (missing.length > 0) {
      setError(`Missing: ${missing.join(", ")}`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/emails/schedule", {
        senderId,
        subject,
        body,
        recipients,
        startTime: new Date(startTime).toISOString(),
        delayBetweenEmailsMs: delayMs,
      });
      onScheduled();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to schedule emails.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Compose New Email">
      <div className="flex flex-col gap-4">
        {senders.length > 0 && (
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Sender</span>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
            >
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.fromAddress})
                </option>
              ))}
            </select>
          </label>
        )}

        <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Textarea label="Body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Leads file (CSV/text)</span>
          <input
            type="file"
            accept=".csv,.txt"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
          />
          {parsing && <span className="mt-1 block text-xs text-slate-400">Parsing file...</span>}
          {!parsing && file && (
            <span className="mt-1 block text-xs text-slate-500">
              {recipients.length} email address{recipients.length !== 1 && "es"} detected
            </span>
          )}
        </label>

        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Start time"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <Input
            label="Delay (ms)"
            type="number"
            min={0}
            value={delayMs}
            onChange={(e) => setDelayMs(Number(e.target.value))}
          />
          <Input
            label="Hourly limit"
            type="number"
            min={1}
            value={hourlyLimit}
            onChange={(e) => setHourlyLimit(Number(e.target.value))}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Scheduling..." : "Schedule"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}