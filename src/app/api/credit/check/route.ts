import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const creditCheckRequestSchema = z.object({
  application_id: z.string().uuid("application_id must be a valid UUID."),
});

type Decision = "PRE_APPROVED" | "NEEDS_REVIEW" | "NOT_ELIGIBLE" | "REJECTED_INPUT";

type DurationUnit = "months" | "years";

const roundMoney = (value: number) => Math.round(value * 100) / 100;
const roundRatio = (value: number) => Math.round(value * 10000) / 10000;

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function getDurationInMonths(durationValue: number, durationUnit: DurationUnit) {
  return durationUnit === "years" ? durationValue * 12 : durationValue;
}

function buildDecision(monthlyIncome: number, durationInMonths: number, debtRatio: number, availableAfterCredit: number) {
  const reasons: string[] = [];
  let decision: Decision;

  if (monthlyIncome <= 0 || durationInMonths <= 0) {
    decision = "REJECTED_INPUT";

    if (monthlyIncome <= 0) {
      reasons.push("Monthly income must be greater than 0.");
    }

    if (durationInMonths <= 0) {
      reasons.push("Credit duration must be greater than 0 months.");
    }

    return { decision, reasons };
  }

  if (debtRatio <= 0.35 && availableAfterCredit >= 1500) {
    decision = "PRE_APPROVED";
    reasons.push("Debt ratio is at or below 35% and available income after credit is at least 1,500 MAD.");
    return { decision, reasons };
  }

  if (debtRatio <= 0.5 && availableAfterCredit >= 500) {
    decision = "NEEDS_REVIEW";
    reasons.push("Debt ratio is at or below 50% and available income after credit is at least 500 MAD.");
    return { decision, reasons };
  }

  decision = "NOT_ELIGIBLE";

  if (debtRatio > 0.5) {
    reasons.push("Debt ratio is above 50%.");
  }

  if (availableAfterCredit < 500) {
    reasons.push("Available income after credit is below 500 MAD.");
  }

  return { decision, reasons };
}

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  const body = await request.json().catch(() => null);
  const parsed = creditCheckRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        correlation_id: correlationId,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseServerClient();
    const { application_id: applicationId } = parsed.data;

    const { data: application, error: applicationError } = await supabase
      .from("credit_applications")
      .select("application_id,bank_customer_id,requested_amount,duration_value,duration_unit,monthly_charges")
      .eq("application_id", applicationId)
      .single();

    if (applicationError || !application) {
      return NextResponse.json(
        {
          correlation_id: correlationId,
          error: "Credit application not found.",
        },
        { status: 404 },
      );
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("bank_customer_id,annual_income")
      .eq("bank_customer_id", application.bank_customer_id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        {
          correlation_id: correlationId,
          error: "Related customer not found.",
        },
        { status: 404 },
      );
    }

    const annualIncome = toNumber(customer.annual_income);
    const requestedAmount = toNumber(application.requested_amount);
    const durationValue = toNumber(application.duration_value);
    const monthlyCharges = toNumber(application.monthly_charges);
    const durationInMonths = getDurationInMonths(durationValue, application.duration_unit);

    const monthlyIncome = annualIncome / 12;
    const estimatedMonthlyPayment = durationInMonths > 0 ? requestedAmount / durationInMonths : 0;
    const availableBeforeCredit = monthlyIncome - monthlyCharges;
    const availableAfterCredit = availableBeforeCredit - estimatedMonthlyPayment;
    const debtRatio = monthlyIncome > 0 ? (monthlyCharges + estimatedMonthlyPayment) / monthlyIncome : 0;

    const { decision, reasons } = buildDecision(
      monthlyIncome,
      durationInMonths,
      debtRatio,
      availableAfterCredit,
    );

    return NextResponse.json({
      correlation_id: correlationId,
      application_id: application.application_id,
      bank_customer_id: application.bank_customer_id,
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
    });
  } catch (error) {
    return NextResponse.json(
      {
        correlation_id: correlationId,
        error: error instanceof Error ? error.message : "Unexpected server error",
      },
      { status: 500 },
    );
  }
}
