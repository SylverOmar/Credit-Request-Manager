import { NextResponse } from "next/server";
import { CustomerInput, customerSchema } from "@/lib/customer-schema";
import { normalizeCustomerInput } from "@/lib/normalize-customer";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const customerSelect =
  "bank_customer_id,national_id,last_name,first_name,age,marital_status,children_count,annual_income";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = customerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseServerClient();
    const customer = normalizeCustomerInput(parsed.data as CustomerInput);
    const { data, error } = await supabase
      .from("customers")
      .upsert(customer, { onConflict: "national_id" })
      .select(customerSelect)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ customer: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error" },
      { status: 500 },
    );
  }
}
