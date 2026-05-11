import { NextResponse } from "next/server";
import { buildHealthReport } from "@/lib/health-diagnostics";

export const runtime = "nodejs";

export async function GET() {
  const report = await buildHealthReport();
  return NextResponse.json(report, {
    status: report.status === "ok" ? 200 : 503,
  });
}
