import { NextResponse } from "next/server";
import {
  CreditApplicationInput,
  creditApplicationSchema,
} from "@/lib/customer-schema";
import { normalizeCustomerInput } from "@/lib/normalize-customer";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const customerSelect =
  "bank_customer_id,national_id,last_name,first_name,age,marital_status,children_count,annual_income";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = creditApplicationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseServerClient();
    const applicationInput = parsed.data as CreditApplicationInput;
    const { credit_request: creditRequest } = applicationInput;
    const customer = normalizeCustomerInput(applicationInput.customer);

    const { data: savedCustomer, error: customerError } = await supabase
      .from("customers")
      .upsert(customer, { onConflict: "national_id" })
      .select(customerSelect)
      .single();

    if (customerError) {
      return NextResponse.json({ error: customerError.message }, { status: 500 });
    }

    const { data: application, error: applicationError } = await supabase
      .from("credit_applications")
      .insert({
        bank_customer_id: savedCustomer.bank_customer_id,
        requested_amount: creditRequest.requested_amount,
        duration_value: creditRequest.duration_value,
        duration_unit: creditRequest.duration_unit,
        monthly_charges: creditRequest.monthly_charges,
        status: "submitted",
      })
      .select(
        "application_id,bank_customer_id,requested_amount,duration_value,duration_unit,monthly_charges,status",
      )
      .single();

    if (applicationError) {
      return NextResponse.json({ error: applicationError.message }, { status: 500 });
    }

    return NextResponse.json({ customer: savedCustomer, application }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error" },
      { status: 500 },
    );
  }
}
