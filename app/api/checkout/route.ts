// app/api/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST(req: NextRequest) {
  // auth.protect() ensures user is authenticated
  const { userId, sessionClaims } = await auth.protect();

  if (!userId || !sessionClaims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { priceId, eventId, quantity = 1 } = await req.json();

  type SessionClaims = {
    tokenIdentifier?: unknown;
  } | null;

  const claims = sessionClaims as SessionClaims;
  const tokenIdentifier =
    claims && typeof claims.tokenIdentifier === "string"
      ? claims.tokenIdentifier
      : `clerk:${userId}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity }],
    success_url: `${process.env.PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.PUBLIC_BASE_URL}/events/${eventId}`,
    metadata: {
      eventId,
      tokenIdentifier, // shows up in the webhook
      app: "rodeo-kiosk",
    },
  });

  return NextResponse.json({ url: session.url }, { status: 200 });
}
