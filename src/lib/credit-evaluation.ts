export type CreditDecision = "PRE_APPROVED" | "NEEDS_REVIEW" | "NOT_ELIGIBLE" | "REJECTED_INPUT";
export type DurationUnit = "months" | "years";

export type CreditEvaluationInput = {
  age?: number;
  marital_status?: string;
  children_count?: number;
  annual_income: number;
  requested_amount: number;
  duration_value: number;
  duration_unit: DurationUnit;
  monthly_charges: number;
};

export type CreditEvaluationResult = {
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
  score: number;
  human_review_required: boolean;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;
const roundRatio = (value: number) => Math.round(value * 10000) / 10000;

export function getDurationInMonths(durationValue: number, durationUnit: DurationUnit) {
  return durationUnit === "years" ? durationValue * 12 : durationValue;
}

export function evaluateCredit(input: CreditEvaluationInput): CreditEvaluationResult {
  const durationInMonths = getDurationInMonths(input.duration_value, input.duration_unit);
  const monthlyIncome = input.annual_income / 12;
  const estimatedMonthlyPayment =
    durationInMonths > 0 ? input.requested_amount / durationInMonths : 0;
  const availableBeforeCredit = monthlyIncome - input.monthly_charges;
  const availableAfterCredit = availableBeforeCredit - estimatedMonthlyPayment;
  const debtRatio =
    monthlyIncome > 0 ? (input.monthly_charges + estimatedMonthlyPayment) / monthlyIncome : 0;

  const reasons: string[] = [];
  let decision: CreditDecision;

  if (monthlyIncome <= 0 || durationInMonths <= 0) {
    decision = "REJECTED_INPUT";

    if (monthlyIncome <= 0) {
      reasons.push("Monthly income must be greater than 0.");
    }

    if (durationInMonths <= 0) {
      reasons.push("Credit duration must be greater than 0 months.");
    }
  } else if (debtRatio <= 0.35 && availableAfterCredit >= 1500) {
    decision = "PRE_APPROVED";
    reasons.push(
      "Debt ratio is at or below 35% and available income after credit is at least 1,500 MAD.",
    );
  } else if (debtRatio <= 0.5 && availableAfterCredit >= 500) {
    decision = "NEEDS_REVIEW";
    reasons.push(
      "Debt ratio is at or below 50% and available income after credit is at least 500 MAD.",
    );
  } else {
    decision = "NOT_ELIGIBLE";

    if (debtRatio > 0.5) {
      reasons.push("Debt ratio is above 50%.");
    }

    if (availableAfterCredit < 500) {
      reasons.push("Available income after credit is below 500 MAD.");
    }
  }

  const score = scoreCredit(decision, debtRatio, availableAfterCredit);

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
    score,
    human_review_required: decision === "NEEDS_REVIEW" || (score >= 55 && score <= 74),
  };
}

function scoreCredit(decision: CreditDecision, debtRatio: number, availableAfterCredit: number) {
  if (decision === "REJECTED_INPUT") return 0;
  if (decision === "NOT_ELIGIBLE") return Math.max(20, Math.min(54, Math.round(70 - debtRatio * 100)));
  if (decision === "NEEDS_REVIEW") return Math.max(55, Math.min(74, Math.round(85 - debtRatio * 100)));
  return Math.max(75, Math.min(95, Math.round(100 - debtRatio * 80 + availableAfterCredit / 1000)));
}
