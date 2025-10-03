// app/api/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { fetchMutation } from "convex/nextjs";
import { internal } from "@/convex/_generated/api";

export const runtime = "nodejs"; // required: webhooks can't run on Edge
export const dynamic = "force-dynamic"; // avoid static optimization

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: process.env.STRIPE_API_VERSION as Stripe.LatestApiVersion | undefined,
  maxNetworkRetries: 2,
});

function isCheckoutSession(object: unknown): object is Stripe.Checkout.Session {
  return (
    !!object &&
    typeof object === "object" &&
    (object as { object?: string }).object === "checkout.session"
  );
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET for Stripe webhook verification");
    return NextResponse.json({ error: "Misconfigured webhook" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text(); // Never parse/alter before verification.

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const dataObject = event.data.object;
        if (!isCheckoutSession(dataObject)) {
          throw new Error("Unexpected object payload for checkout.session.completed");
        }

        await fetchMutation(internal.stripeEvents.ingest, {
          eventId: event.id,
          type: event.type,
          created: event.created,
          sessionId: dataObject.id,
          clientReferenceId: dataObject.client_reference_id ?? undefined,
          raw: JSON.stringify(dataObject),
        });

        break;
      }
      default:
        // Fast 2xx for events we do not handle yet keeps the delivery channel healthy.
        break;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to process Stripe webhook", { eventId: event.id, type: event.type, message });
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return new NextResponse(null, { status: 200 });
}
