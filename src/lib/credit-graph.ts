import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import {
  CreditEvaluationInput,
  CreditEvaluationResult,
  evaluateCredit,
} from "@/lib/credit-evaluation";

type AgentAnalysis = {
  agent_id: string;
  status: "completed" | "fallback";
  observations: string[];
  red_flags: string[];
};

type CreditReport = {
  executive_summary: string;
  strengths: string[];
  watch_points: string[];
  recommendation: string;
  limitations: string;
};

type LlmLog = {
  node_name: string;
  agent_name: string;
  model_name: string;
  prompt_version: string;
  latency_ms: number;
  status: "success" | "fallback";
  error_code?: string;
};

const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

const CreditGraphState = Annotation.Root({
  input: Annotation<CreditEvaluationInput>(),
  correlation_id: Annotation<string>(),
  result: Annotation<CreditEvaluationResult | null>(),
  supervisor_plan: Annotation<string[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  agent_analyses: Annotation<AgentAnalysis[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  report: Annotation<CreditReport | null>(),
  llm_logs: Annotation<LlmLog[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  graph_steps: Annotation<string[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
});

const supervisorNode = async () => ({
  supervisor_plan: [
    "profile_agent_node",
    "income_agent_node",
    "charges_agent_node",
    "credit_request_agent_node",
    "risk_agent_node",
  ],
  graph_steps: ["supervisor_node: assigned specialist analysis tasks"],
});

const calculatorPolicyNode = async (state: typeof CreditGraphState.State) => ({
  result: evaluateCredit(state.input),
  graph_steps: ["financial_calculator_node: computed metrics", "policy_engine_node: applied rules"],
});

const specialistAgentsNode = async (state: typeof CreditGraphState.State) => {
  const startedAt = Date.now();
  const fallback = buildFallbackAnalyses(state.input, state.result);

  try {
    const analysis = await callGroqJson<{
      agent_analyses: AgentAnalysis[];
    }>({
      system:
        "You are a banking credit pre-evaluation specialist. Return only valid JSON. Do not approve credit definitively. Do not invent missing facts.",
      user: JSON.stringify({
        task: "Generate concise specialist agent analyses for profile, income, charges, requested credit, and global risk.",
        input: state.input,
        metrics: state.result?.metrics,
        decision: state.result?.decision,
        required_shape: {
          agent_analyses: fallback,
        },
      }),
    });

    return {
      agent_analyses: analysis.agent_analyses,
      llm_logs: [
        {
          node_name: "parallel_agents_node",
          agent_name: "specialist_agents",
          model_name: GROQ_MODEL,
          prompt_version: "v1.0.0",
          latency_ms: Date.now() - startedAt,
          status: "success" as const,
        },
      ],
      graph_steps: ["parallel_agents_node: completed Groq specialist analyses"],
    };
  } catch (error) {
    return {
      agent_analyses: fallback,
      llm_logs: [
        {
          node_name: "parallel_agents_node",
          agent_name: "specialist_agents",
          model_name: GROQ_MODEL,
          prompt_version: "v1.0.0",
          latency_ms: Date.now() - startedAt,
          status: "fallback" as const,
          error_code: error instanceof Error ? error.message : "GROQ_ERROR",
        },
      ],
      graph_steps: ["parallel_agents_node: used deterministic fallback analyses"],
    };
  }
};

const reportNode = async (state: typeof CreditGraphState.State) => {
  const startedAt = Date.now();
  const fallback = buildFallbackReport(state.result, state.agent_analyses);

  try {
    const report = await callGroqJson<{ report: CreditReport }>({
      system:
        "You write concise banking pre-evaluation reports. Return only valid JSON. Never state that credit is definitively approved. Do not invent interest rates, profession, bank history, assets, debts, or contract terms.",
      user: JSON.stringify({
        task: "Write the final concise report from deterministic metrics and agent analyses.",
        metrics: state.result?.metrics,
        decision: state.result?.decision,
        score: state.result?.score,
        reasons: state.result?.reasons,
        agent_analyses: state.agent_analyses,
        required_shape: { report: fallback },
      }),
    });

    return {
      report: report.report,
      llm_logs: [
        {
          node_name: "report_agent_node",
          agent_name: "report_agent",
          model_name: GROQ_MODEL,
          prompt_version: "v1.0.0",
          latency_ms: Date.now() - startedAt,
          status: "success" as const,
        },
      ],
      graph_steps: ["report_agent_node: generated Groq report"],
    };
  } catch (error) {
    return {
      report: fallback,
      llm_logs: [
        {
          node_name: "report_agent_node",
          agent_name: "report_agent",
          model_name: GROQ_MODEL,
          prompt_version: "v1.0.0",
          latency_ms: Date.now() - startedAt,
          status: "fallback" as const,
          error_code: error instanceof Error ? error.message : "GROQ_ERROR",
        },
      ],
      graph_steps: ["report_agent_node: used deterministic fallback report"],
    };
  }
};

const creditEvaluationGraph = new StateGraph(CreditGraphState)
  .addNode("supervisor", supervisorNode)
  .addNode("calculator_policy", calculatorPolicyNode)
  .addNode("specialist_agents", specialistAgentsNode)
  .addNode("report_agent", reportNode)
  .addEdge(START, "supervisor")
  .addEdge("supervisor", "calculator_policy")
  .addEdge("calculator_policy", "specialist_agents")
  .addEdge("specialist_agents", "report_agent")
  .addEdge("report_agent", END)
  .compile();

export async function runCreditEvaluationGraph(
  input: CreditEvaluationInput,
  correlationId: string,
) {
  const state = await creditEvaluationGraph.invoke({
    input,
    correlation_id: correlationId,
    result: null,
    report: null,
  });

  if (!state.result) {
    throw new Error("Credit evaluation graph did not return a result.");
  }

  return {
    ...state.result,
    status: state.result.decision,
    decision_label: decisionLabel(state.result.decision),
    report: state.report ?? buildFallbackReport(state.result, state.agent_analyses),
    agent_analyses: state.agent_analyses,
    supervisor_plan: state.supervisor_plan,
    llm_logs: state.llm_logs,
    graph_steps: state.graph_steps,
    warnings: [
      "Cette analyse est une pre-evaluation automatique et ne constitue pas une decision bancaire definitive.",
    ],
  };
}

async function callGroqJson<T>({ system, user }: { system: string; user: string }): Promise<T> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY_MISSING");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`GROQ_${response.status}`);
  }

  const payload = await response.json();
  return JSON.parse(payload.choices?.[0]?.message?.content ?? "{}") as T;
}

function buildFallbackAnalyses(
  input: CreditEvaluationInput,
  result: CreditEvaluationResult | null,
): AgentAnalysis[] {
  const debtPercent = result ? Math.round(result.metrics.debt_ratio * 100) : 0;
  return [
    {
      agent_id: "profile_agent_node",
      status: "fallback",
      observations: [
        `Profil: age ${input.age ?? "non fourni"}, situation ${input.marital_status ?? "non fournie"}, enfants ${input.children_count ?? "non fourni"}.`,
      ],
      red_flags: [],
    },
    {
      agent_id: "income_agent_node",
      status: "fallback",
      observations: [`Revenu annuel declare: ${input.annual_income} MAD.`],
      red_flags: input.annual_income <= 0 ? ["Revenu invalide."] : [],
    },
    {
      agent_id: "charges_agent_node",
      status: "fallback",
      observations: [`Charges mensuelles: ${input.monthly_charges} MAD, taux d'effort estime ${debtPercent}%.`],
      red_flags: result && result.metrics.debt_ratio > 0.5 ? ["Taux d'effort eleve."] : [],
    },
    {
      agent_id: "credit_request_agent_node",
      status: "fallback",
      observations: [
        `Credit demande: ${input.requested_amount} MAD sur ${result?.metrics.duration_in_months ?? input.duration_value} mois. Mensualite hors interets, assurance et frais.`,
      ],
      red_flags: [],
    },
    {
      agent_id: "risk_agent_node",
      status: "fallback",
      observations: [`Decision indicative: ${result?.decision ?? "indisponible"}.`],
      red_flags: result?.decision === "NOT_ELIGIBLE" ? ["Profil non eligible selon les seuils MVP."] : [],
    },
  ];
}

function buildFallbackReport(
  result: CreditEvaluationResult | null,
  analyses: AgentAnalysis[],
): CreditReport {
  return {
    executive_summary: `Pre-evaluation terminee avec decision indicative ${result?.decision ?? "indisponible"} et score ${result?.score ?? 0}/100.`,
    strengths: analyses.flatMap((analysis) => analysis.observations).slice(0, 3),
    watch_points: [
      ...result?.reasons ?? [],
      ...analyses.flatMap((analysis) => analysis.red_flags),
    ].slice(0, 5),
    recommendation:
      result?.decision === "PRE_APPROVED"
        ? "Continuer vers la revue bancaire finale."
        : "Transmettre le dossier a une revue humaine ou demander correction des donnees selon le cas.",
    limitations:
      "Cette analyse est une pre-evaluation automatique. Elle exclut les interets, assurances, frais et toute decision bancaire definitive.",
  };
}

function decisionLabel(decision: string) {
  const labels: Record<string, string> = {
    PRE_APPROVED: "Pre-accord indicatif",
    NEEDS_REVIEW: "Analyse humaine necessaire",
    NOT_ELIGIBLE: "Non eligible selon les seuils MVP",
    REJECTED_INPUT: "Donnees invalides",
  };

  return labels[decision] ?? decision;
}
