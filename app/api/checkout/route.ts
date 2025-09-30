// app/api/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  // 1) Clerk: make sure the user is signed in
  const { userId, sessionClaims } = await auth.protect();

  // 2) Extract a stable owner key for your ticket rows
  //    (Clerk JWTs often include tokenIdentifier in sessionClaims)
  const tokenIdentifier =
    (sessionClaims as { tokenIdentifier?: string } | null)?.tokenIdentifier ??
    `clerk:${userId}`;

  // 3) Read the payload from your button
  const { priceId, quantity } = await req.json();

  // (Optional) tiny guard; you can beef this up later
  if (!priceId || !quantity) {
    return NextResponse.json({ error: "Missing priceId or quantity" }, { status: 400 });
  }

  // 4) Create the Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity }],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/test`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/test`,
    client_reference_id: tokenIdentifier, // <-- this ties the paid session to your user
    metadata:{
      eventId: "demo",
      quantity: String(quantity),
    }
  });

  // 5) Give the client the URL to open (you already use window.open(url, "_blank"))
  return NextResponse.json({ url: session.url });
}
