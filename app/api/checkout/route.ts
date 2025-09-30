// Notes for developer:
// - NEXT_PUBLIC_SITE_URL and STRIPE_SECRET_KEY must be set in Next.js env.
// - Clerk auth.protect() ensures only signed-in users can initiate checkout.

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

const stripe = new Stripe(stripeSecret);

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth.protect();
  const tokenIdentifier =
    (sessionClaims as { tokenIdentifier?: string } | null)?.tokenIdentifier ??
    `clerk:${userId}`;

  const body = await req.json();
  const priceId = body?.priceId as string | undefined;
  const quantityInput = Number(body?.quantity ?? 1);
  const eventId = (body?.eventId as string | undefined) ?? "general";

  if (!priceId || Number.isNaN(quantityInput) || quantityInput <= 0) {
    return NextResponse.json(
      { error: "Missing priceId or invalid quantity" },
      { status: 400 },
    );
  }

  const quantity = Math.max(1, Math.floor(quantityInput));

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_SITE_URL is not set" }, { status: 500 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity }],
    success_url: `${siteUrl}/test`,
    cancel_url: `${siteUrl}/test`,
    client_reference_id: tokenIdentifier,
    metadata: {
      eventId,
      quantity: String(quantity),
    },
  });

  return NextResponse.json({ url: session.url });
}
