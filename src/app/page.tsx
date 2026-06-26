"use client";

import { FormEvent, useState } from "react";
import {
  CreditApplication,
  CreditRequestInput,
  Customer,
  CustomerInput,
  creditRequestSchema,
  customerSchema,
  durationUnitOptions,
  maritalStatusOptions,
  moroccanIdHelp,
  moroccanIdPattern,
} from "@/lib/customer-schema";
import { type CreditDecision } from "@/lib/credit-evaluation";
import { normalizeCustomerInput } from "@/lib/normalize-customer";

type Step = "search" | "customer_form" | "customer_review" | "credit" | "application_review" | "saved";
type CustomerMode = "new" | "existing";
type CustomerDraft = Omit<CustomerInput, "age" | "children_count" | "annual_income"> & {
  age: string;
  children_count: string;
  annual_income: string;
};
type CreditRequestDraft = Omit<
  CreditRequestInput,
  "requested_amount" | "duration_value" | "monthly_charges"
> & {
  requested_amount: string;
  duration_value: string;
  monthly_charges: string;
};
type CreditEvaluationResult = {
  correlation_id: string;
  application_id: string;
  bank_customer_id: string;
  metrics: {
    monthly_income: number;
    estimated_monthly_payment: number;
    available_before_credit: number;
    available_after_credit: number;
    debt_ratio: number;
    duration_in_months: number;
  };
  decision: CreditDecision;
  reasons: string[];
};
type ApiErrorPayload = {
  error?: string;
  correlation_id?: string;
};

const emptyCustomer: CustomerDraft = {
  national_id: "",
  last_name: "",
  first_name: "",
  age: "",
  marital_status: "single",
  children_count: "",
  annual_income: "",
};

const emptyCreditRequest: CreditRequestDraft = {
  requested_amount: "",
  duration_value: "",
  duration_unit: "months",
  monthly_charges: "",
};

const decisionLabels: Record<CreditDecision, string> = {
  PRE_APPROVED: "Pre-evaluation favorable",
  NEEDS_REVIEW: "A verifier par un conseiller",
  NOT_ELIGIBLE: "Non eligible selon les criteres actuels",
  REJECTED_INPUT: "Donnees insuffisantes pour evaluer",
};

function statusLabel(value: CustomerInput["marital_status"]) {
  return maritalStatusOptions.find((option) => option.value === value)?.label ?? value;
}

function durationUnitLabel(value: CreditRequestInput["duration_unit"]) {
  return durationUnitOptions.find((option) => option.value === value)?.label ?? value;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRatio(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function normalizeCustomer(raw: Customer): CustomerInput {
  return {
    bank_customer_id: raw.bank_customer_id,
    national_id: raw.national_id,
    last_name: raw.last_name,
    first_name: raw.first_name,
    age: Number(raw.age),
    marital_status: raw.marital_status,
    children_count: Number(raw.children_count),
    annual_income: Number(raw.annual_income),
  };
}

function toCustomerDraft(customer: CustomerInput): CustomerDraft {
  return {
    ...customer,
    age: customer.age.toString(),
    children_count: customer.children_count.toString(),
    annual_income: customer.annual_income.toString(),
  };
}

function toCreditRequestDraft(creditRequest: CreditRequestInput): CreditRequestDraft {
  return {
    ...creditRequest,
    requested_amount: creditRequest.requested_amount.toString(),
    duration_value: creditRequest.duration_value.toString(),
    monthly_charges: creditRequest.monthly_charges.toString(),
  };
}

function numericDisplay(value: string) {
  return Number(value);
}

function flattenErrors(errors: Record<string, string[] | undefined>) {
  return Object.fromEntries(
    Object.entries(errors).map(([key, value]) => [key, value?.[0] ?? "Valeur invalide"]),
  );
}

export default function Home() {
  const [step, setStep] = useState<Step>("search");
  const [customerMode, setCustomerMode] = useState<CustomerMode | null>(null);
  const [lookupId, setLookupId] = useState("");
  const [customer, setCustomer] = useState<CustomerDraft>(emptyCustomer);
  const [originalCustomer, setOriginalCustomer] = useState<CustomerInput | null>(null);
  const [creditRequest, setCreditRequest] = useState<CreditRequestDraft>(emptyCreditRequest);
  const [savedApplication, setSavedApplication] = useState<CreditApplication | null>(null);
  const [evaluation, setEvaluation] = useState<CreditEvaluationResult | null>(null);
  const [evaluationError, setEvaluationError] = useState("");
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function clearError(key: string) {
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function updateCustomer<K extends keyof CustomerDraft>(key: K, value: CustomerDraft[K]) {
    setCustomer((current) => ({ ...current, [key]: value }));
    clearError(key);
  }

  function updateCreditRequest<K extends keyof CreditRequestDraft>(
    key: K,
    value: CreditRequestDraft[K],
  ) {
    setCreditRequest((current) => ({ ...current, [key]: value }));
    clearError(key);
  }

  async function searchCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setFieldErrors({});

    const nationalId = lookupId.trim().toUpperCase();
    if (!moroccanIdPattern.test(nationalId)) {
      setLoading(false);
      setFieldErrors({ national_id: moroccanIdHelp });
      return;
    }

    const response = await fetch(`/api/customers/${encodeURIComponent(nationalId)}`);
    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (response.ok && payload.customer) {
      const existingCustomer = normalizeCustomer(payload.customer);
      setCustomer(toCustomerDraft(existingCustomer));
      setOriginalCustomer(existingCustomer);
      setCustomerMode("existing");
      setStep("customer_review");
      setMessage("Client trouve. Verifiez les informations avec le client.");
      return;
    }

    if (response.status === 404) {
      setCustomer({ ...emptyCustomer, national_id: nationalId });
      setOriginalCustomer(null);
      setCustomerMode("new");
      setStep("customer_form");
      setMessage("Aucun client trouve. Completez la fiche client.");
      return;
    }

    setMessage(payload.error ?? "Recherche impossible pour le moment.");
  }

  function reviewCustomerForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = customerSchema.safeParse(customer);

    if (!parsed.success) {
      setFieldErrors(flattenErrors(parsed.error.flatten().fieldErrors));
      return;
    }

    setCustomer(toCustomerDraft(normalizeCustomerInput(parsed.data as CustomerInput)));
    setFieldErrors({});
    setStep("customer_review");
    setMessage("Relisez les informations avec le client avant confirmation.");
  }

  async function confirmCustomer() {
    const parsed = customerSchema.safeParse(customer);

    if (!parsed.success) {
      setFieldErrors(flattenErrors(parsed.error.flatten().fieldErrors));
      setStep("customer_form");
      return;
    }

    const normalized = normalizeCustomerInput(parsed.data as CustomerInput);
    const unchangedExistingCustomer =
      customerMode === "existing" &&
      originalCustomer !== null &&
      JSON.stringify(normalized) === JSON.stringify(normalizeCustomerInput(originalCustomer));

    if (unchangedExistingCustomer) {
      setCustomer(toCustomerDraft(normalized));
      setStep("credit");
      setMessage("Informations client confirmees. Saisissez la demande de credit.");
      return;
    }

    setLoading(true);
    setMessage("");

    const response = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalized),
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Enregistrement client impossible.");
      return;
    }

    const savedCustomer = normalizeCustomer(payload.customer);
    setCustomer(toCustomerDraft(savedCustomer));
    setOriginalCustomer(savedCustomer);
    setStep("credit");
    setMessage("Informations client confirmees. Saisissez la demande de credit.");
  }

  function reviewCreditRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const creditParsed = creditRequestSchema.safeParse(creditRequest);

    if (!creditParsed.success) {
      setFieldErrors(flattenErrors(creditParsed.error.flatten().fieldErrors));
      return;
    }

    setCreditRequest(toCreditRequestDraft(creditParsed.data as CreditRequestInput));
    setFieldErrors({});
    setStep("application_review");
    setMessage("Relisez la demande avec le client avant soumission.");
  }

  async function submitApplication() {
    const parsedCustomer = customerSchema.safeParse(customer);
    const parsedCredit = creditRequestSchema.safeParse(creditRequest);

    if (!parsedCustomer.success) {
      setFieldErrors(flattenErrors(parsedCustomer.error.flatten().fieldErrors));
      setStep("customer_form");
      return;
    }

    if (!parsedCredit.success) {
      setFieldErrors(flattenErrors(parsedCredit.error.flatten().fieldErrors));
      setStep("credit");
      return;
    }

    setLoading(true);
    setMessage("");
    setEvaluation(null);
    setEvaluationError("");

    const response = await fetch("/api/credit-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: parsedCustomer.data as CustomerInput,
        credit_request: parsedCredit.data as CreditRequestInput,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Soumission impossible.");
      return;
    }

    setCustomer(toCustomerDraft(normalizeCustomer(payload.customer)));
    setSavedApplication(payload.application);
    setStep("saved");
    setMessage("Demande de credit enregistree.");
  }

  async function runCreditEvaluation() {
    if (!savedApplication) {
      setEvaluationError("Enregistrez la demande avant de lancer la pre-evaluation.");
      return;
    }

    setEvaluationLoading(true);
    setEvaluationError("");
    setEvaluation(null);

    const response = await fetch("/api/credit/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ application_id: savedApplication.application_id }),
    });
    const payload = (await response.json().catch(() => ({}))) as Partial<CreditEvaluationResult> &
      ApiErrorPayload;
    setEvaluationLoading(false);

    if (!response.ok) {
      const suffix = payload.correlation_id ? ` Reference: ${payload.correlation_id}` : "";
      setEvaluationError(`${payload.error ?? "Pre-evaluation impossible."}${suffix}`);
      return;
    }

    setEvaluation(payload as CreditEvaluationResult);
  }

  function resetSearch() {
    setStep("search");
    setCustomerMode(null);
    setLookupId("");
    setCustomer(emptyCustomer);
    setOriginalCustomer(null);
    setCreditRequest(emptyCreditRequest);
    setSavedApplication(null);
    setEvaluation(null);
    setEvaluationError("");
    setEvaluationLoading(false);
    setFieldErrors({});
    setMessage("");
  }

  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              Credit Intake
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              Demande de credit client
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Verifiez l&apos;identite client, saisissez les parametres de credit, puis soumettez
              la demande avec un identifiant bancaire interne.
            </p>
          </div>
          <div className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
            Espace conseiller bancaire
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[360px_1fr]">
        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Recherche client</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Commencez par la CIN/CNIE. Les informations retrouvees doivent etre confirmees avec le
            client avant la demande.
          </p>

          <form className="mt-5 space-y-3" onSubmit={searchCustomer}>
            <label className="block text-sm font-medium text-slate-700" htmlFor="lookup-id">
              CIN / CNIE
            </label>
            <input
              id="lookup-id"
              value={lookupId}
              onChange={(event) => setLookupId(event.target.value.toUpperCase())}
              className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              placeholder="A1234567"
              autoComplete="off"
            />
            {fieldErrors.national_id ? (
              <p className="text-sm text-red-700">{fieldErrors.national_id}</p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Recherche..." : "Rechercher"}
            </button>
          </form>

          {message ? (
            <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700">
              {message}
            </div>
          ) : null}
        </aside>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          {step === "search" ? <EmptyState /> : null}
          {step === "customer_form" ? (
            <CustomerForm
              customer={customer}
              fieldErrors={fieldErrors}
              onChange={updateCustomer}
              onSubmit={reviewCustomerForm}
            />
          ) : null}
          {step === "customer_review" ? (
            <CustomerReview
              customer={customer}
              mode={customerMode ?? "new"}
              loading={loading}
              onEdit={() => setStep("customer_form")}
              onConfirm={confirmCustomer}
            />
          ) : null}
          {step === "credit" ? (
            <CreditRequestForm
              customer={customer}
              creditRequest={creditRequest}
              fieldErrors={fieldErrors}
              onEditCustomer={() => setStep("customer_form")}
              onChange={updateCreditRequest}
              onSubmit={reviewCreditRequest}
            />
          ) : null}
          {step === "application_review" || step === "saved" ? (
            <ApplicationReview
              customer={customer}
              creditRequest={creditRequest}
              application={savedApplication}
              saved={step === "saved"}
              loading={loading}
              evaluation={evaluation}
              evaluationLoading={evaluationLoading}
              evaluationError={evaluationError}
              onEditCustomer={() => setStep("customer_form")}
              onEditCredit={() => setStep("credit")}
              onConfirm={step === "saved" ? resetSearch : submitApplication}
              onEvaluate={runCreditEvaluation}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[420px] flex-col justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
        En attente
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-950">
        Lancez la recherche par CIN/CNIE
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
        Si le client existe, ses informations seront affichees pour confirmation. Sinon, le
        formulaire de creation sera ouvert.
      </p>
    </div>
  );
}

function CustomerForm({
  customer,
  fieldErrors,
  onChange,
  onSubmit,
}: {
  customer: CustomerDraft;
  fieldErrors: Record<string, string>;
  onChange: <K extends keyof CustomerDraft>(key: K, value: CustomerDraft[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit}>
      <SectionHeader
        eyebrow={customer.bank_customer_id ? "Modification client" : "Nouveau client"}
        title="Saisir les informations client"
        text="Tous les champs sont obligatoires. La fiche sera affichee avant confirmation."
      />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <TextField
          label="CIN / CNIE"
          value={customer.national_id}
          error={fieldErrors.national_id}
          onChange={(value) => onChange("national_id", value.toUpperCase())}
        />
        <TextField
          label="Nom"
          value={customer.last_name}
          error={fieldErrors.last_name}
          onChange={(value) => onChange("last_name", value)}
        />
        <TextField
          label="Prenom"
          value={customer.first_name}
          error={fieldErrors.first_name}
          onChange={(value) => onChange("first_name", value)}
        />
        <NumberField
          label="Age"
          value={customer.age}
          min={18}
          max={100}
          error={fieldErrors.age}
          onChange={(value) => onChange("age", value)}
        />
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Situation maritale</span>
          <select
            value={customer.marital_status}
            onChange={(event) =>
              onChange("marital_status", event.target.value as CustomerDraft["marital_status"])
            }
            className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          >
            {maritalStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <NumberField
          label="Enfants"
          value={customer.children_count}
          min={0}
          max={20}
          error={fieldErrors.children_count}
          onChange={(value) => onChange("children_count", value)}
        />
        <NumberField
          label="Revenu annuel (MAD)"
          value={customer.annual_income}
          min={0}
          max={100000000}
          error={fieldErrors.annual_income}
          onChange={(value) => onChange("annual_income", value)}
        />
      </div>
      <ActionBar text="La fiche sera affichee pour verification avant enregistrement." label="Verifier" />
    </form>
  );
}

function CustomerReview({
  customer,
  mode,
  loading,
  onEdit,
  onConfirm,
}: {
  customer: CustomerDraft;
  mode: CustomerMode;
  loading: boolean;
  onEdit: () => void;
  onConfirm: () => void;
}) {
  const rows: Array<[string, string]> = [
    ["ID interne banque", customer.bank_customer_id ?? "Genere apres confirmation"],
    ["CIN / CNIE", customer.national_id],
    ["Nom", customer.last_name],
    ["Prenom", customer.first_name],
    ["Age", `${customer.age} ans`],
    ["Situation maritale", statusLabel(customer.marital_status)],
    ["Enfants", customer.children_count.toString()],
    ["Revenu annuel", formatCurrency(numericDisplay(customer.annual_income))],
  ];

  return (
    <div>
      <SectionHeader
        eyebrow={mode === "existing" ? "Client trouve" : "Verification client"}
        title="Confirmer les informations client"
        text="Relisez ces informations avec le client. Modifiez-les si une information est incorrecte."
      />
      <InfoGrid rows={rows} />
      <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onEdit}
          className="h-11 rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          Modifier
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="h-11 rounded-md bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Enregistrement..." : "Confirmer"}
        </button>
      </div>
    </div>
  );
}

function CreditRequestForm({
  customer,
  creditRequest,
  fieldErrors,
  onEditCustomer,
  onChange,
  onSubmit,
}: {
  customer: CustomerDraft;
  creditRequest: CreditRequestDraft;
  fieldErrors: Record<string, string>;
  onEditCustomer: () => void;
  onChange: <K extends keyof CreditRequestDraft>(key: K, value: CreditRequestDraft[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit}>
      <SectionHeader
        eyebrow="Demande de credit"
        title="Saisir les parametres de financement"
        text={`${customer.first_name || "Client"} ${customer.last_name || ""} - ${customer.national_id}`}
      />
      <button
        type="button"
        onClick={onEditCustomer}
        className="mt-4 h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
      >
        Modifier les informations client
      </button>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <NumberField
          label="Montant demande (MAD)"
          value={creditRequest.requested_amount}
          min={1000}
          max={100000000}
          error={fieldErrors.requested_amount}
          onChange={(value) => onChange("requested_amount", value)}
        />
        <NumberField
          label="Charges mensuelles (MAD)"
          value={creditRequest.monthly_charges}
          min={0}
          max={10000000}
          error={fieldErrors.monthly_charges}
          onChange={(value) => onChange("monthly_charges", value)}
        />
        <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
          <NumberField
            label="Duree"
            value={creditRequest.duration_value}
            min={1}
            max={600}
            error={fieldErrors.duration_value}
            onChange={(value) => onChange("duration_value", value)}
          />
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Unite de duree</span>
            <select
              value={creditRequest.duration_unit}
              onChange={(event) =>
                onChange("duration_unit", event.target.value as CreditRequestDraft["duration_unit"])
              }
              className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            >
              {durationUnitOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <ActionBar text="Verifiez la demande avant soumission finale." label="Verifier" />
    </form>
  );
}

function ApplicationReview({
  customer,
  creditRequest,
  application,
  saved,
  loading,
  evaluation,
  evaluationLoading,
  evaluationError,
  onEditCustomer,
  onEditCredit,
  onConfirm,
  onEvaluate,
}: {
  customer: CustomerDraft;
  creditRequest: CreditRequestDraft;
  application: CreditApplication | null;
  saved: boolean;
  loading: boolean;
  evaluation: CreditEvaluationResult | null;
  evaluationLoading: boolean;
  evaluationError: string;
  onEditCustomer: () => void;
  onEditCredit: () => void;
  onConfirm: () => void;
  onEvaluate: () => void;
}) {
  const rows: Array<[string, string]> = [
    ["ID interne banque", customer.bank_customer_id ?? "Genere apres confirmation"],
    ["CIN / CNIE", customer.national_id],
    ["Nom", customer.last_name],
    ["Prenom", customer.first_name],
    ["Age", `${customer.age} ans`],
    ["Situation maritale", statusLabel(customer.marital_status)],
    ["Enfants", customer.children_count.toString()],
    ["Revenu annuel", formatCurrency(numericDisplay(customer.annual_income))],
    ["Montant demande", formatCurrency(numericDisplay(creditRequest.requested_amount))],
    ["Duree", `${creditRequest.duration_value} ${durationUnitLabel(creditRequest.duration_unit)}`],
    ["Charges mensuelles", formatCurrency(numericDisplay(creditRequest.monthly_charges))],
    ["Application", application?.application_id ?? "Generee apres soumission"],
  ];

  return (
    <div>
      <SectionHeader
        eyebrow={saved ? "Demande enregistree" : "Verification finale"}
        title="Relire la demande complete"
        text="Relisez toutes les informations avec le client avant validation finale."
      />
      <InfoGrid rows={rows} />
      {saved ? (
        <CreditEvaluationPanel
          evaluation={evaluation}
          loading={evaluationLoading}
          error={evaluationError}
          onEvaluate={onEvaluate}
        />
      ) : null}
      <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onEditCustomer}
          disabled={saved}
          className="h-11 rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Modifier client
        </button>
        <button
          type="button"
          onClick={onEditCredit}
          disabled={saved}
          className="h-11 rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Modifier credit
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="h-11 rounded-md bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saved ? "Nouvelle recherche" : loading ? "Soumission..." : "Confirmer et soumettre"}
        </button>
      </div>
    </div>
  );
}

function CreditEvaluationPanel({
  evaluation,
  loading,
  error,
  onEvaluate,
}: {
  evaluation: CreditEvaluationResult | null;
  loading: boolean;
  error: string;
  onEvaluate: () => void;
}) {
  const rows: Array<[string, string]> = evaluation
    ? [
        ["Revenu mensuel", formatCurrency(evaluation.metrics.monthly_income)],
        ["Mensualite estimee", formatCurrency(evaluation.metrics.estimated_monthly_payment)],
        ["Disponible avant credit", formatCurrency(evaluation.metrics.available_before_credit)],
        ["Disponible apres credit", formatCurrency(evaluation.metrics.available_after_credit)],
        ["Taux d'endettement", formatRatio(evaluation.metrics.debt_ratio)],
        ["Duree totale", `${evaluation.metrics.duration_in_months} mois`],
        ["Reference de traitement", evaluation.correlation_id],
      ]
    : [];

  return (
    <div className="mt-6 rounded-lg border border-teal-200 bg-teal-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-800">
            Pre-evaluation
          </p>
          <p className="mt-2 text-sm leading-6 text-teal-950">
            Lancez un premier controle automatique base sur les donnees de la demande. Ce resultat
            reste indicatif.
          </p>
        </div>
        <button
          type="button"
          onClick={onEvaluate}
          disabled={loading}
          className="h-11 rounded-md bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Evaluation..." : "Lancer pre-evaluation"}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm font-medium text-red-700">{error}</p> : null}

      {evaluation ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-md border border-teal-300 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Resultat
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              {decisionLabels[evaluation.decision]}
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
              {evaluation.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
          <InfoGrid rows={rows} />
        </div>
      ) : null}
    </div>
  );
}

function InfoGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="mt-6 grid gap-3 md:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {label}
          </dt>
          <dd className="mt-2 break-words text-base font-semibold text-slate-950">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SectionHeader({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="flex flex-col gap-2 border-b border-slate-200 pb-5">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">{eyebrow}</p>
      <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
      <p className="text-sm text-slate-600">{text}</p>
    </div>
  );
}

function ActionBar({ text, label }: { text: string; label: string }) {
  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600">{text}</p>
      <button
        type="submit"
        className="h-11 rounded-md bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800"
      >
        {label}
      </button>
    </div>
  );
}

function TextField({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        required
      />
      {error ? <span className="mt-1 block text-sm text-red-700">{error}</span> : null}
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  error,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        data-min={min}
        data-max={max}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
        className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        required
      />
      {error ? <span className="mt-1 block text-sm text-red-700">{error}</span> : null}
    </label>
  );
}
