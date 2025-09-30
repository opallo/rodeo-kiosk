// app/api/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const runtime = "nodejs"; // required: webhooks can't run on Edge
export const dynamic = "force-dynamic"; // avoid static optimization

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const convex = new ConvexHttpClient(process.env.CONVEX_URL!);

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
        const clientReferenceId = session.client_reference_id;
        const metadata = session.metadata as Stripe.Metadata | null;
        const eventId = metadata?.["eventId"];
        const quantityRaw = metadata?.["quantity"];

        if (!clientReferenceId || !eventId || !quantityRaw) {
          console.error("Missing checkout metadata", {
            clientReferenceId,
            eventId,
            quantity: quantityRaw,
          });
          return NextResponse.json({ error: "Missing checkout metadata" }, { status: 400 });
        }

        const quantity = Number(quantityRaw);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          console.error("Invalid ticket quantity", { quantity: quantityRaw });
          return NextResponse.json({ error: "Invalid ticket quantity" }, { status: 400 });
        }

        const secret = process.env.FORM_ACTION_SECRET;
        if (!secret) {
          console.error("FORM_ACTION_SECRET is not configured");
          throw new Error("FORM_ACTION_SECRET is required");
        }

        try {
          await convex.action(api.webhook.issueTickets, {
            secret,
            owner: clientReferenceId,
            eventId,
            quantity,
            stripeEventId: event.id,
          });
        } catch (convexError) {
          console.error("Failed to issue tickets in Convex", convexError);
          throw convexError;
        }
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
