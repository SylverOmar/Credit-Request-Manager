import Link from "next/link";

const workflowState = [
  ["Workflow", "Actif"],
  ["Kill-switch", "Inactif"],
  ["Mode", "Normal"],
  ["Executions aujourd'hui", "Suivi via correlation_id"],
];

const globalKpis = [
  ["Demandes traitees", "credit_applications"],
  ["Succes", "API 2xx"],
  ["Echecs", "API 4xx/5xx"],
  ["Revue humaine", "NEEDS_REVIEW"],
  ["PRE_APPROVED", "Decision indicative"],
  ["NOT_ELIGIBLE", "Decision indicative"],
];

const llmKpis = [
  ["Modele", "llama-3.1-8b-instant"],
  ["Provider", "Groq"],
  ["Fallback", "Deterministe si Groq indisponible"],
  ["Hallucination", "Controle par consignes + fallback"],
  ["Logs LLM", "Retournes par execution"],
  ["Prompt version", "v1.0.0"],
];

const technicalKpis = [
  ["Correlation ID", "Chaque evaluation"],
  ["LangGraph", "Supervisor -> Policy -> Agents -> Rapport"],
  ["Tests", "Vitest + GitHub Actions"],
  ["Docker", "Standalone Next.js"],
  ["Vercel", "Production auto-deploy"],
  ["Health API", "/api/health"],
];

const recentLogs = [
  ["correlation_id", "statut", "decision", "score", "latency_ms", "llm_status"],
  ["Genere a l'execution", "SUCCESS", "Selon dossier", "0-100", "Mesure par node", "success/fallback"],
];

export default function TechnicalDashboardPage() {
  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              Monitoring workflow
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Dashboard technique credit
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Suivi interne du workflow LangGraph, des agents Groq, des decisions et des livrables
              de validation.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link className="rounded-md border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-800" href="/">
              Demande
            </Link>
            <a className="rounded-md border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-800" href="/api/health">
              Health
            </a>
          </nav>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8">
        <DashboardSection title="Etat du workflow" rows={workflowState} />
        <DashboardSection title="KPIs globaux" rows={globalKpis} />
        <DashboardSection title="KPIs LLM" rows={llmKpis} />
        <DashboardSection title="KPIs techniques" rows={technicalKpis} />

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Kill-switch</h2>
              <p className="mt-1 text-sm text-slate-600">
                Controle prevu par le runbook. Mode lecture pour le MVP de demonstration.
              </p>
            </div>
            <div className="flex gap-2">
              <button className="h-10 rounded-md border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-800" type="button">
                Stopper le workflow
              </button>
              <button className="h-10 rounded-md border border-teal-300 bg-teal-50 px-4 text-sm font-semibold text-teal-900" type="button">
                Relancer le workflow
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Logs recents</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <tbody>
                {recentLogs.map((row) => (
                  <tr key={row.join("-")} className="border-t border-slate-200">
                    {row.map((cell) => (
                      <td key={cell} className="px-3 py-3 text-slate-700">
                        {cell}
                      </td>
                    ))}
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

function DashboardSection({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold">{title}</h2>
      <dl className="mt-4 grid gap-3 md:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {label}
            </dt>
            <dd className="mt-2 text-sm font-semibold text-slate-950">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
