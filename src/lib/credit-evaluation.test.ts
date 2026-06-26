import { describe, expect, it } from "vitest";
import { calculateCreditEvaluation } from "./credit-evaluation";

describe("calculateCreditEvaluation", () => {
  it("returns PRE_APPROVED when debt ratio and available income are strong", () => {
    const result = calculateCreditEvaluation({
      annual_income: 240000,
      requested_amount: 120000,
      duration_value: 60,
      duration_unit: "months",
      monthly_charges: 3000,
    });

    expect(result.decision).toBe("PRE_APPROVED");
    expect(result.metrics.monthly_income).toBe(20000);
    expect(result.metrics.estimated_monthly_payment).toBe(2000);
    expect(result.metrics.available_after_credit).toBe(15000);
    expect(result.metrics.debt_ratio).toBe(0.25);
  });

  it("returns NEEDS_REVIEW when ratios are acceptable but not pre-approved", () => {
    const result = calculateCreditEvaluation({
      annual_income: 120000,
      requested_amount: 120000,
      duration_value: 60,
      duration_unit: "months",
      monthly_charges: 2500,
    });

    expect(result.decision).toBe("NEEDS_REVIEW");
    expect(result.metrics.monthly_income).toBe(10000);
    expect(result.metrics.estimated_monthly_payment).toBe(2000);
    expect(result.metrics.available_after_credit).toBe(5500);
    expect(result.metrics.debt_ratio).toBe(0.45);
  });

  it("returns NOT_ELIGIBLE when debt ratio is too high", () => {
    const result = calculateCreditEvaluation({
      annual_income: 120000,
      requested_amount: 180000,
      duration_value: 60,
      duration_unit: "months",
      monthly_charges: 3000,
    });

    expect(result.decision).toBe("NOT_ELIGIBLE");
    expect(result.metrics.debt_ratio).toBe(0.6);
  });

  it("returns REJECTED_INPUT when annual income is 0", () => {
    const result = calculateCreditEvaluation({
      annual_income: 0,
      requested_amount: 120000,
      duration_value: 60,
      duration_unit: "months",
      monthly_charges: 3000,
    });

    expect(result.decision).toBe("REJECTED_INPUT");
    expect(result.reasons).toContain("Monthly income must be greater than 0.");
  });

  it("converts years to months", () => {
    const result = calculateCreditEvaluation({
      annual_income: 240000,
      requested_amount: 120000,
      duration_value: 5,
      duration_unit: "years",
      monthly_charges: 3000,
    });

    expect(result.metrics.duration_in_months).toBe(60);
    expect(result.metrics.estimated_monthly_payment).toBe(2000);
  });
});
