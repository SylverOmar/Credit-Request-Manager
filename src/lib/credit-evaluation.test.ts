import { describe, expect, it } from "vitest";
import { evaluateCredit, getDurationInMonths } from "./credit-evaluation";

describe("evaluateCredit", () => {
  it("returns PRE_APPROVED for low debt and strong available income", () => {
    const result = evaluateCredit({
      annual_income: 240000,
      requested_amount: 60000,
      duration_value: 60,
      duration_unit: "months",
      monthly_charges: 2000,
    });

    expect(result.decision).toBe("PRE_APPROVED");
    expect(result.metrics.monthly_income).toBe(20000);
    expect(result.metrics.estimated_monthly_payment).toBe(1000);
  });

  it("returns NEEDS_REVIEW for medium debt", () => {
    const result = evaluateCredit({
      annual_income: 120000,
      requested_amount: 36000,
      duration_value: 12,
      duration_unit: "months",
      monthly_charges: 1500,
    });

    expect(result.decision).toBe("NEEDS_REVIEW");
    expect(result.metrics.debt_ratio).toBe(0.45);
  });

  it("returns NOT_ELIGIBLE for excessive debt", () => {
    const result = evaluateCredit({
      annual_income: 60000,
      requested_amount: 60000,
      duration_value: 12,
      duration_unit: "months",
      monthly_charges: 1000,
    });

    expect(result.decision).toBe("NOT_ELIGIBLE");
    expect(result.reasons).toContain("Debt ratio is above 50%.");
  });

  it("returns REJECTED_INPUT when income is zero", () => {
    const result = evaluateCredit({
      annual_income: 0,
      requested_amount: 10000,
      duration_value: 12,
      duration_unit: "months",
      monthly_charges: 0,
    });

    expect(result.decision).toBe("REJECTED_INPUT");
    expect(result.reasons).toContain("Monthly income must be greater than 0.");
  });

  it("converts years to months", () => {
    expect(getDurationInMonths(5, "years")).toBe(60);
  });
});
