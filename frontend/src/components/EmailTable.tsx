import type { EmailJob } from "../types";
import { StatusBadge, EmptyState, LoadingSpinner } from "./Feedback";

interface EmailTableProps {
  jobs: EmailJob[];
  loading: boolean;
  mode: "scheduled" | "sent";
}

export function EmailTable({ jobs, loading, mode }: EmailTableProps) {
  if (loading) return <LoadingSpinner label={`Loading ${mode} emails...`} />;

  if (jobs.length === 0) {
    return (
      <EmptyState
        title={mode === "scheduled" ? "No scheduled emails yet" : "No sent emails yet"}
        subtitle={
          mode === "scheduled"
            ? "Compose a new email to get started."
            : "Sent emails will show up here once they go out."
        }
      />
    );
  }

  const dateLabel = mode === "scheduled" ? "Scheduled time" : "Sent time";

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-slate-500">Email</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500">Subject</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500">{dateLabel}</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {jobs.map((job) => (
            <tr key={job.id}>
              <td className="px-4 py-3 text-slate-700">{job.toAddress}</td>
              <td className="px-4 py-3 text-slate-700">{job.subject}</td>
              <td className="px-4 py-3 text-slate-500">
                {new Date(mode === "scheduled" ? job.scheduledFor : job.sentAt ?? job.scheduledFor).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={job.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
