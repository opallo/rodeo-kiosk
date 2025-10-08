// app/api/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { fetchAction } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export const runtime = "nodejs";        // Webhooks must run on Node, not Edge
export const dynamic = "force-dynamic"; // Disable static optimization

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: (process.env.STRIPE_API_VERSION as Stripe.LatestApiVersion) ?? undefined,
  maxNetworkRetries: 2,
});

function isCheckoutSession(obj: unknown): obj is Stripe.Checkout.Session {
  return !!obj && typeof obj === "object" && (obj as { object?: string }).object === "checkout.session";
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook] Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Misconfigured webhook" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  // Use the raw body for Stripe signature verification
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook] Signature verification failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const obj = event.data.object;
        if (!isCheckoutSession(obj)) {
          throw new Error("Unexpected payload for checkout.session.completed");
        }

        // Ensure Convex connection + shared token exist in this runtime
        if (!process.env.CONVEX_URL && !process.env.CONVEX_DEPLOYMENT) {
          throw new Error("Missing CONVEX_URL or CONVEX_DEPLOYMENT in webhook runtime");
        }
        if (!process.env.CONVEX_INGEST_TOKEN) {
          throw new Error("Missing CONVEX_INGEST_TOKEN in webhook runtime");
        }

        // Keep it primitive/small; fetch extras later if you need them
        const payload = {
          eventId: event.id,
          type: event.type,
          created: event.created,
          sessionId: obj.id,
          clientReferenceId: obj.client_reference_id ?? undefined,
          raw: JSON.stringify({
            id: obj.id,
            mode: obj.mode,
            amount_total: obj.amount_total,
            currency: obj.currency,
            payment_intent:
              typeof obj.payment_intent === "string"
                ? obj.payment_intent
                : obj.payment_intent?.id,
            customer:
              typeof obj.customer === "string"
                ? obj.customer
                : obj.customer?.id,
            metadata: obj.metadata,
          }),
          token: process.env.CONVEX_INGEST_TOKEN!, // verified in the action
        } as const;

        // ✅ Call the PUBLIC ACTION, not the internal mutation
        await fetchAction(api.stripeEvents.ingestAction, payload);

        const tokenIdentifier = obj.metadata?.tokenIdentifier;
        if (typeof tokenIdentifier !== "string" || !tokenIdentifier) {
          // Stay strict: if we don't know who owns the ticket, don't mint yet.
          console.warn("[webhook] Missing metadata.tokenIdentifier; skipping mint.");
          break;
        }

        const metadataQuantity = obj.metadata?.quantity;
        const parsedQuantity =
          typeof metadataQuantity === "string" ? Number.parseInt(metadataQuantity, 10) : NaN;
        const quantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;

        const mintToken = process.env.CONVEX_MINT_TOKEN;
        if (!mintToken) {
          console.error("[webhook] Missing CONVEX_MINT_TOKEN in Next.js env; skipping mint.");
          break;
        }

        const mintResult = await fetchAction(api.ticketsActions.mintFromCheckoutSessionAction, {
          sessionId: obj.id,
          eventId: obj.metadata?.eventId ?? "demo-event-123",
          tokenIdentifier,
          amountTotal: obj.amount_total ?? 0,
          currency: obj.currency ?? "usd",
          created: event.created, // seconds epoch
          quantity,
          token: mintToken, // shared secret checked by the action
        });

        console.log("[webhook] minted tickets", {
          sessionId: obj.id,
          mintedCount: mintResult.mintedCount,
          ticketIds: mintResult.tickets.map((ticket) => ticket.ticketId),
        });
        break;
      }
      default:
        // No-op for unhandled events; still 2xx keeps delivery healthy
        break;
    }

    return new NextResponse(null, { status: 200 });
  } catch (err) {
    console.error("[webhook] Failed to process", {
      eventId: event.id,
      type: event.type,
      error: err,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
