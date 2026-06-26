import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "credit-request-manager",
    checks: {
      web: "ok",
      supabase_env: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      groq_env: Boolean(process.env.GROQ_API_KEY),
    },
  });
}
