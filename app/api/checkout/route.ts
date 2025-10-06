// app/api/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: process.env.STRIPE_API_VERSION as Stripe.LatestApiVersion | undefined,
  maxNetworkRetries: 2,
});

type CheckoutRequest = {
  priceId?: unknown;
  quantity?: unknown;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CheckoutRequest;

  if (typeof body.priceId !== "string" || !body.priceId) {
    return NextResponse.json({ error: "priceId is required" }, { status: 400 });
  }

  const parsedQuantity =
    typeof body.quantity === "number" && Number.isInteger(body.quantity) && body.quantity > 0
      ? body.quantity
      : 1;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: body.priceId, quantity: parsedQuantity }],
    client_reference_id: crypto.randomUUID(), // Attach a stable key so the webhook can link back to the client request.
    metadata: { eventId: "demo-event-123" }, // Minimal metadata proves end-to-end flow and is easy to extend later.
    success_url: `${siteUrl}/payment-succeeded`,
    cancel_url: `${siteUrl}/payment-failed`,
  });

  return NextResponse.json({ url: session.url });
}
