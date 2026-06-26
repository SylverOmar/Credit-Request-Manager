import { NextResponse } from "next/server";
import { moroccanIdPattern } from "@/lib/customer-schema";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const customerSelect =
  "bank_customer_id,national_id,last_name,first_name,age,marital_status,children_count,annual_income";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const nationalId = decodeURIComponent(id).trim().toUpperCase();

  if (!moroccanIdPattern.test(nationalId)) {
    return NextResponse.json({ error: "Invalid Moroccan CIN/CNIE format" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("customers")
      .select(customerSelect)
      .eq("national_id", nationalId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ customer: null }, { status: 404 });
    }

    return NextResponse.json({ customer: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error" },
      { status: 500 },
    );
  }
}
