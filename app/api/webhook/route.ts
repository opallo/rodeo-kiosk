// app/api/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs"; // required: webhooks can't run on Edge
export const dynamic = "force-dynamic"; // avoid static optimization

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  // 1) Read raw body for signature verification
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // 2) Handle events you care about
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // TODO: mint/activate ticket in Convex (idempotent on event.id)
        // session.id, session.client_reference_id, session.metadata, etc.
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        // TODO: mark any pending reservation as expired
        break;
      }
      default:
        // ignore others
        break;
    }
  } catch (err) {
    // Your handler threw—return 500 so Stripe can retry
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // 3) Acknowledge receipt
  return new NextResponse(null, { status: 200 });
}
