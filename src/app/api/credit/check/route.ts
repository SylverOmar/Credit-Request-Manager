import { NextResponse } from "next/server";
import { z } from "zod";
import { runCreditEvaluationGraph } from "@/lib/credit-graph";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const creditCheckRequestSchema = z.object({
  application_id: z.string().uuid("application_id must be a valid UUID."),
});

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function isNotFound(error: { code?: string } | null) {
  return error?.code === "PGRST116";
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

    if (applicationError && !isNotFound(applicationError)) {
      return NextResponse.json(
        {
          correlation_id: correlationId,
          error: "Unable to load credit application.",
        },
        { status: 500 },
      );
    }

    if (isNotFound(applicationError) || !application) {
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

    if (customerError && !isNotFound(customerError)) {
      return NextResponse.json(
        {
          correlation_id: correlationId,
          error: "Unable to load related customer.",
        },
        { status: 500 },
      );
    }

    if (isNotFound(customerError) || !customer) {
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
    const evaluation = await runCreditEvaluationGraph({
      annual_income: annualIncome,
      requested_amount: requestedAmount,
      duration_value: durationValue,
      duration_unit: application.duration_unit,
      monthly_charges: monthlyCharges,
    }, correlationId);

    return NextResponse.json({
      correlation_id: correlationId,
      application_id: application.application_id,
      bank_customer_id: application.bank_customer_id,
      ...evaluation,
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
