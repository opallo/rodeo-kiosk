// app/api/tickets/redeem/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchAction } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { auth, currentUser } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { ticketId?: unknown; kioskId?: unknown };

export async function POST(req: NextRequest) {
  // 1) Require a signed-in Clerk user
  const { userId } = await auth.protect();

  // 2) Check role from Clerk user metadata (roles: string[])
  const user = await currentUser(); // safe because auth.protect() passed
  if (!user || user.id !== userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const roles = (user.publicMetadata?.roles as string[] | undefined) ?? [];
  if (!roles.includes("kiosk")) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  // 3) Ensure Convex shared secret is present (action will verify it too)
  const redeemToken = process.env.CONVEX_REDEEM_TOKEN;
  if (!redeemToken) {
    return NextResponse.json(
      { ok: false, error: "Server missing CONVEX_REDEEM_TOKEN" },
      { status: 500 }
    );
  }

  // 4) Parse body
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const ticketId =
    typeof body.ticketId === "string" && body.ticketId.trim() ? body.ticketId.trim() : null;
  const kioskId =
    typeof body.kioskId === "string" && body.kioskId.trim() ? body.kioskId.trim() : null;

  if (!ticketId || !kioskId) {
    return NextResponse.json(
      { ok: false, error: "ticketId and kioskId are required" },
      { status: 400 }
    );
  }

  // 5) Best-effort IP / UA for audit
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;

  // 6) Call Convex action (which then calls the internal mutation)
  try {
    const result = await fetchAction(api.ticketsActions.redeemTicketAction, {
      ticketId,
      kioskId,
      token: redeemToken, // shared secret checked inside the action
      ip,
      userAgent,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[redeem] action failed", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Redeem failed" },
      { status: 500 }
    );
  }
}
