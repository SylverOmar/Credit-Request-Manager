import assert from "node:assert/strict";
import test from "node:test";
import { calculateCreditEvaluation } from "./credit-evaluation.ts";

test("returns PRE_APPROVED when debt ratio and available income are strong", () => {
  const result = calculateCreditEvaluation({
    annual_income: 240000,
    requested_amount: 120000,
    duration_value: 60,
    duration_unit: "months",
    monthly_charges: 3000,
  });

  assert.equal(result.decision, "PRE_APPROVED");
  assert.equal(result.metrics.monthly_income, 20000);
  assert.equal(result.metrics.estimated_monthly_payment, 2000);
  assert.equal(result.metrics.available_after_credit, 15000);
  assert.equal(result.metrics.debt_ratio, 0.25);
});

test("returns NEEDS_REVIEW when ratios are acceptable but not pre-approved", () => {
  const result = calculateCreditEvaluation({
    annual_income: 120000,
    requested_amount: 120000,
    duration_value: 60,
    duration_unit: "months",
    monthly_charges: 2500,
  });

  assert.equal(result.decision, "NEEDS_REVIEW");
  assert.equal(result.metrics.monthly_income, 10000);
  assert.equal(result.metrics.estimated_monthly_payment, 2000);
  assert.equal(result.metrics.available_after_credit, 5500);
  assert.equal(result.metrics.debt_ratio, 0.45);
});

test("returns NOT_ELIGIBLE when debt ratio is too high", () => {
  const result = calculateCreditEvaluation({
    annual_income: 120000,
    requested_amount: 180000,
    duration_value: 60,
    duration_unit: "months",
    monthly_charges: 3000,
  });

  assert.equal(result.decision, "NOT_ELIGIBLE");
  assert.equal(result.metrics.debt_ratio, 0.6);
});

test("returns REJECTED_INPUT when monthly income is 0", () => {
  const result = calculateCreditEvaluation({
    annual_income: 0,
    requested_amount: 120000,
    duration_value: 60,
    duration_unit: "months",
    monthly_charges: 3000,
  });

  assert.equal(result.decision, "REJECTED_INPUT");
  assert.ok(result.reasons.includes("Monthly income must be greater than 0."));
});

test("converts years to months", () => {
  const result = calculateCreditEvaluation({
    annual_income: 240000,
    requested_amount: 120000,
    duration_value: 5,
    duration_unit: "years",
    monthly_charges: 3000,
  });

  assert.equal(result.metrics.duration_in_months, 60);
  assert.equal(result.metrics.estimated_monthly_payment, 2000);
});
