// app/api/checkout-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: (process.env.STRIPE_API_VERSION as Stripe.LatestApiVersion) ?? undefined,
  maxNetworkRetries: 2,
});

export async function GET(req: NextRequest) {
  // Require a signed-in user
  await auth.protect();

  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ ok: false, error: "Missing or invalid session_id" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });

    const paid =
      session.status === "complete" && session.payment_status === "paid";

    return NextResponse.json({
      ok: true as const,
      paid,
      session: {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
        customer:
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? null,
        client_reference_id: session.client_reference_id ?? null,
        metadata: session.metadata ?? {},
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to retrieve session" }, { status: 500 });
  }
}
