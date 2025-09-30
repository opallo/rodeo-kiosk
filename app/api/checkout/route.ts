// app/api/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!); // set sk_test_... in env

export async function POST(req: NextRequest) {
  const { priceId, quantity } = await req.json();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity }],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/test`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/test`,
  });

  return NextResponse.json({ url: session.url });
}
