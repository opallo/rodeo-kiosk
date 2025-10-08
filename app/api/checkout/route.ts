// app/api/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: (process.env.STRIPE_API_VERSION as Stripe.LatestApiVersion) ?? undefined,
  maxNetworkRetries: 2,
});

type CheckoutRequest = {
  priceId?: unknown;
  quantity?: unknown;
  eventId?: unknown; // optional, lets you set which event this purchase is for
};

export async function POST(req: NextRequest) {
  // Require a signed-in user
  const { userId } = await auth.protect();

  const body = (await req.json()) as CheckoutRequest;

  if (typeof body.priceId !== "string" || !body.priceId) {
    return NextResponse.json({ error: "priceId is required" }, { status: 400 });
  }

  const quantity =
    typeof body.quantity === "number" && Number.isInteger(body.quantity) && body.quantity > 0
      ? body.quantity
      : 1;

  const eventId =
    typeof body.eventId === "string" && body.eventId ? body.eventId : "demo-event-123";

  // Build a Convex-compatible tokenIdentifier from your Clerk issuer + userId.
  // If you’ve set CLERK_JWT_ISSUER_DOMAIN (recommended), we use it.
  const issuer = process.env.CLERK_JWT_ISSUER_DOMAIN; // e.g. https://your-subdomain.clerk.accounts.dev
  const tokenIdentifier = issuer ? `${issuer}|${userId}` : userId;

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    req.headers.get("origin") ??
    "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: body.priceId, quantity }],
    client_reference_id: randomUUID(),
    // 👇 webhook will read these to mint the ticket
    metadata: {
      eventId,
      tokenIdentifier,
      userId, // helpful for debugging; mint uses tokenIdentifier
    },
    success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/`,
  });

  return NextResponse.json({ url: session.url });
}
