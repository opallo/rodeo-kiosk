// app/api/tickets/validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Require auth (keeps this from being "public public")
  await auth.protect();

  const ticketId = req.nextUrl.searchParams.get("ticketId");
  if (!ticketId) {
    return NextResponse.json({ ok: false, error: "ticketId is required" }, { status: 400 });
  }

  try {
    const ticket = await fetchQuery(api.tickets.getByTicketId, { ticketId });

    if (!ticket) {
      return NextResponse.json({ ok: true, found: false }, { status: 200 });
    }

    // Minimal safe payload for validators
    return NextResponse.json(
      {
        ok: true,
        found: true,
        ticket: {
          ticketId: ticket.ticketId,
          eventId: ticket.eventId,
          status: ticket.status,
          issuedAt: ticket.issuedAt,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Lookup failed" },
      { status: 500 }
    );
  }
}
