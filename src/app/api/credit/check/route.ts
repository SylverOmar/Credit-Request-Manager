import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateCreditEvaluation, toNumber } from "@/lib/credit-evaluation";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const creditCheckRequestSchema = z.object({
  application_id: z.string().uuid("application_id must be a valid UUID."),
});

function isNotFoundError(error: { code?: string } | null) {
  return error?.code === "PGRST116";
}

function databaseError(correlationId: string, errorMessage = "Database error.") {
  return NextResponse.json(
    {
      correlation_id: correlationId,
      error: errorMessage,
    },
    { status: 500 },
  );
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

    if (applicationError) {
      if (isNotFoundError(applicationError)) {
        return NextResponse.json(
          {
            correlation_id: correlationId,
            error: "Credit application not found.",
          },
          { status: 404 },
        );
      }

      return databaseError(correlationId, applicationError.message);
    }

    if (!application) {
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

    if (customerError) {
      if (isNotFoundError(customerError)) {
        return NextResponse.json(
          {
            correlation_id: correlationId,
            error: "Related customer not found.",
          },
          { status: 404 },
        );
      }

      return databaseError(correlationId, customerError.message);
    }

    if (!customer) {
      return NextResponse.json(
        {
          correlation_id: correlationId,
          error: "Related customer not found.",
        },
        { status: 404 },
      );
    }

    const evaluation = calculateCreditEvaluation({
      annual_income: toNumber(customer.annual_income),
      requested_amount: toNumber(application.requested_amount),
      duration_value: toNumber(application.duration_value),
      duration_unit: application.duration_unit,
      monthly_charges: toNumber(application.monthly_charges),
    });

    return NextResponse.json({
      correlation_id: correlationId,
      application_id: application.application_id,
      bank_customer_id: application.bank_customer_id,
      metrics: evaluation.metrics,
      decision: evaluation.decision,
      reasons: evaluation.reasons,
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
