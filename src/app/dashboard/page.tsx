const deliverables = [
  ["Intake client", "Operationnel"],
  ["Supabase", "Connecte"],
  ["Pre-evaluation", "LangGraph deterministe"],
  ["Correlation ID", "Present sur l'API credit"],
  ["Tests automatises", "Vitest + GitHub Actions"],
  ["Deploiement", "Vercel"],
  ["Documentation", "Agent Card + Runbook"],
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#eef3f8] px-5 py-8 text-slate-950">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
          Pilotage
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Tableau de bord credit
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Vue technique minimale pour verifier l&apos;etat du projet, les livrables et la disponibilite
          du parcours de demande.
        </p>
        <dl className="mt-8 grid gap-4 md:grid-cols-2">
          {deliverables.map(([label, value]) => (
            <div key={label} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {label}
              </dt>
              <dd className="mt-2 text-lg font-semibold text-slate-950">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
