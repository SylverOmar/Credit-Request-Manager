import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import {
  CreditEvaluationInput,
  CreditEvaluationResult,
  evaluateCredit,
} from "@/lib/credit-evaluation";

const CreditGraphState = Annotation.Root({
  input: Annotation<CreditEvaluationInput>(),
  correlation_id: Annotation<string>(),
  result: Annotation<CreditEvaluationResult | null>(),
  steps: Annotation<string[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
});

const supervisorNode = async () => ({
  steps: ["supervisor: received credit pre-evaluation request"],
});

const calculatorPolicyNode = async (state: typeof CreditGraphState.State) => ({
  result: evaluateCredit(state.input),
  steps: ["calculator_policy: computed metrics and deterministic decision"],
});

const creditEvaluationGraph = new StateGraph(CreditGraphState)
  .addNode("supervisor", supervisorNode)
  .addNode("calculator_policy", calculatorPolicyNode)
  .addEdge(START, "supervisor")
  .addEdge("supervisor", "calculator_policy")
  .addEdge("calculator_policy", END)
  .compile();

export async function runCreditEvaluationGraph(
  input: CreditEvaluationInput,
  correlationId: string,
) {
  const state = await creditEvaluationGraph.invoke({
    input,
    correlation_id: correlationId,
    result: null,
  });

  if (!state.result) {
    throw new Error("Credit evaluation graph did not return a result.");
  }

  return {
    ...state.result,
    graph_steps: state.steps,
  };
}
