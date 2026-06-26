"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type LogRow = {
  correlationId: string;
  event: string;
  status: string;
  decision: string;
  latency: string;
  llmStatus: string;
};

const initialLogs: LogRow[] = [
  {
    correlationId: "runtime-generated",
    event: "credit_check",
    status: "SUCCESS",
    decision: "Selon dossier",
    latency: "Mesuree par node",
    llmStatus: "success/fallback",
  },
];

export default function TechnicalDashboardPage() {
  const [isStopped, setIsStopped] = useState(false);
  const [logs, setLogs] = useState(initialLogs);

  const status = useMemo(
    () => ({
      label: isStopped ? "Workflow stoppe" : "Workflow actif",
      detail: isStopped
        ? "Les nouvelles evaluations sont bloquees jusqu'a relance."
        : "Les evaluations peuvent etre executees normalement.",
      tone: isStopped
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-teal-200 bg-teal-50 text-teal-900",
    }),
    [isStopped],
  );

  function writeLog(event: string, nextStatus: string) {
    setLogs((current) => [
      {
        correlationId: crypto.randomUUID().slice(0, 8),
        event,
        status: nextStatus,
        decision: "Controle operationnel",
        latency: "0 ms",
        llmStatus: "non requis",
      },
      ...current.slice(0, 5),
    ]);
  }

  function stopWorkflow() {
    setIsStopped(true);
    writeLog("kill_switch_stop", "STOPPED");
  }

  function restartWorkflow() {
    setIsStopped(false);
    writeLog("kill_switch_restart", "RUNNING");
  }

  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-950">
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8">
        <nav className="flex justify-end">
          <Link
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            href="/"
          >
            Demande
          </Link>
        </nav>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                Controle operationnel
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">Kill-switch</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Interruption ou relance manuelle du workflow de pre-evaluation en cas d&apos;incident.
              </p>
            </div>

            <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${status.tone}`}>
              <div>{status.label}</div>
              <div className="mt-1 text-xs font-medium opacity-80">{status.detail}</div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2">
            <button
              className="h-11 rounded-md border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={isStopped}
              onClick={stopWorkflow}
              type="button"
            >
              Stopper le workflow
            </button>
            <button
              className="h-11 rounded-md border border-teal-300 bg-teal-50 px-4 text-sm font-semibold text-teal-900 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!isStopped}
              onClick={restartWorkflow}
              type="button"
            >
              Relancer le workflow
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Observabilite
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Logs recents</h2>
            </div>
            <p className="text-sm text-slate-600">Dernieres actions et evaluations tracees.</p>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr>
                  {["correlation_id", "event", "statut", "decision", "latency_ms", "llm_status"].map(
                    (header) => (
                      <th
                        className="border-y border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 first:rounded-l-md first:border-l last:rounded-r-md last:border-r"
                        key={header}
                      >
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={`${row.correlationId}-${row.event}`}>
                    <td className="border-b border-slate-100 px-4 py-4 font-mono text-xs text-slate-700">
                      {row.correlationId}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 text-slate-800">{row.event}</td>
                    <td className="border-b border-slate-100 px-4 py-4">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {row.status}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 text-slate-700">{row.decision}</td>
                    <td className="border-b border-slate-100 px-4 py-4 text-slate-700">{row.latency}</td>
                    <td className="border-b border-slate-100 px-4 py-4 text-slate-700">{row.llmStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
