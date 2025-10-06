// app/api/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

type StripeApiVersion = string;

type StripeCheckoutSessionCreateParams = {
  mode: "payment";
  line_items: Array<{ price: string; quantity: number }>;
  client_reference_id?: string;
  metadata?: Record<string, string>;
  success_url: string;
  cancel_url: string;
};

type StripeCheckoutSession = {
  id: string;
  url: string | null;
};

type StripeConstructor = new (
  apiKey: string,
  config?: {
    apiVersion?: StripeApiVersion | null;
    maxNetworkRetries?: number;
  },
) => {
  checkout: {
    sessions: {
      create(params: StripeCheckoutSessionCreateParams): Promise<StripeCheckoutSession>;
    };
  };
};

const StripeClient = require("stripe") as StripeConstructor;

export const runtime = "nodejs";

const stripe = new StripeClient(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: process.env.STRIPE_API_VERSION ?? undefined,
  maxNetworkRetries: 2,
});

type CheckoutRequest = {
  priceId?: unknown;
  quantity?: unknown;
};

export async function POST(req: NextRequest) {
  const { userId } = await auth.protect();

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
    client_reference_id: userId,
    metadata: {
      eventId: "demo-event-123",
      quantity: String(parsedQuantity),
    },
    success_url: `${siteUrl}/checkout-succeeded?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/payment-failed`,
  });

  return NextResponse.json({ url: session.url });
}
