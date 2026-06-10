import { cleanupUnconfirmedUsers } from "@/lib/actions/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const result = await cleanupUnconfirmedUsers();

  if (result.success) {
    return NextResponse.json({
      success: true,
      message: `Successfully ran cleanup. Deleted ${result.deletedCount} unconfirmed account(s).`
    });
  } else {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }
}
