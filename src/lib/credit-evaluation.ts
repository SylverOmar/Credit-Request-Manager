export type CreditDecision = "PRE_APPROVED" | "NEEDS_REVIEW" | "NOT_ELIGIBLE" | "REJECTED_INPUT";

export type CreditEvaluationInput = {
  annual_income: number;
  requested_amount: number;
  duration_value: number;
  duration_unit: "months" | "years";
  monthly_charges: number;
};

export type CreditEvaluationMetrics = {
  monthly_income: number;
  estimated_monthly_payment: number;
  available_before_credit: number;
  available_after_credit: number;
  debt_ratio: number;
  duration_in_months: number;
};

export type CreditEvaluation = {
  metrics: CreditEvaluationMetrics;
  decision: CreditDecision;
  reasons: string[];
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;
const roundRatio = (value: number) => Math.round(value * 10000) / 10000;

export function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

export function getDurationInMonths(durationValue: number, durationUnit: "months" | "years") {
  return durationUnit === "years" ? durationValue * 12 : durationValue;
}

function buildDecision(
  monthlyIncome: number,
  durationInMonths: number,
  debtRatio: number,
  availableAfterCredit: number,
) {
  const reasons: string[] = [];

  if (monthlyIncome <= 0 || durationInMonths <= 0) {
    if (monthlyIncome <= 0) {
      reasons.push("Monthly income must be greater than 0.");
    }

    if (durationInMonths <= 0) {
      reasons.push("Credit duration must be greater than 0 months.");
    }

    return { decision: "REJECTED_INPUT" as const, reasons };
  }

  if (debtRatio <= 0.35 && availableAfterCredit >= 1500) {
    reasons.push("Debt ratio is at or below 35% and available income after credit is at least 1,500 MAD.");
    return { decision: "PRE_APPROVED" as const, reasons };
  }

  if (debtRatio <= 0.5 && availableAfterCredit >= 500) {
    reasons.push("Debt ratio is at or below 50% and available income after credit is at least 500 MAD.");
    return { decision: "NEEDS_REVIEW" as const, reasons };
  }

  if (debtRatio > 0.5) {
    reasons.push("Debt ratio is above 50%.");
  }

  if (availableAfterCredit < 500) {
    reasons.push("Available income after credit is below 500 MAD.");
  }

  return { decision: "NOT_ELIGIBLE" as const, reasons };
}

export function calculateCreditEvaluation(input: CreditEvaluationInput): CreditEvaluation {
  const durationInMonths = getDurationInMonths(input.duration_value, input.duration_unit);
  const monthlyIncome = input.annual_income / 12;
  const estimatedMonthlyPayment = durationInMonths > 0 ? input.requested_amount / durationInMonths : 0;
  const availableBeforeCredit = monthlyIncome - input.monthly_charges;
  const availableAfterCredit = availableBeforeCredit - estimatedMonthlyPayment;
  const debtRatio = monthlyIncome > 0 ? (input.monthly_charges + estimatedMonthlyPayment) / monthlyIncome : 0;
  const { decision, reasons } = buildDecision(
    monthlyIncome,
    durationInMonths,
    debtRatio,
    availableAfterCredit,
  );

  return {
    metrics: {
      monthly_income: roundMoney(monthlyIncome),
      estimated_monthly_payment: roundMoney(estimatedMonthlyPayment),
      available_before_credit: roundMoney(availableBeforeCredit),
      available_after_credit: roundMoney(availableAfterCredit),
      debt_ratio: roundRatio(debtRatio),
      duration_in_months: durationInMonths,
    },
    decision,
    reasons,
  };
}
