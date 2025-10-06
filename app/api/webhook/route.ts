// app/api/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchAction } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

type StripeApiVersion = string;

type StripeCheckoutSession = {
  object: "checkout.session";
  id: string;
  client_reference_id: string | null;
  metadata?: Record<string, string | null> | null;
  amount_total: number | null;
  currency: string | null;
  payment_status:
    | "paid"
    | "unpaid"
    | "no_payment_required"
    | "processing"
    | "failed";
  customer: string | { id: string } | null;
  mode: string | null;
  payment_intent?: string | { id: string } | null;
};

type StripeEvent = {
  id: string;
  type: string;
  data: { object: unknown };
  created: number;
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
      create(params: unknown): Promise<unknown>;
    };
  };
  webhooks: {
    constructEvent(body: string, signature: string, secret: string): StripeEvent;
  };
};

const StripeClient = require("stripe") as StripeConstructor;

export const runtime = "nodejs";        // Webhooks must run on Node, not Edge
export const dynamic = "force-dynamic"; // Disable static optimization

const stripe = new StripeClient(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: process.env.STRIPE_API_VERSION ?? undefined,
  maxNetworkRetries: 2,
});

function isCheckoutSession(obj: unknown): obj is StripeCheckoutSession {
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

  let event: StripeEvent;
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

        const clientReferenceId = obj.client_reference_id;
        if (!clientReferenceId) {
          throw new Error("checkout.session.completed missing client_reference_id");
        }

        const quantity = Number(obj.metadata?.quantity ?? 1);

        await fetchAction(api.stripeFulfillment.fulfillCheckoutFromWebhook, {
          token: process.env.CONVEX_INGEST_TOKEN!,
          stripeSessionId: obj.id,
          userId: clientReferenceId,
          eventId: obj.metadata?.eventId ?? "unknown-event",
          quantity: Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1,
          amountTotal: obj.amount_total ?? undefined,
          currency: obj.currency ?? undefined,
          paymentStatus: obj.payment_status ?? undefined,
          customerId:
            typeof obj.customer === "string"
              ? obj.customer
              : obj.customer?.id,
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

/*
After-you-code test plan:
1. stripe listen --events checkout.session.completed --forward-to localhost:3000/api/webhook
2. Purchase via the UI (test card), get redirected to /checkout-succeeded?session_id=...
3. Page should show “waiting…” briefly, then list real tickets with QRs.
4. Confirm purchases and tickets rows in Convex dashboard.
5. See tickets also in the new “Recent tickets (mine)” panel on the home debug page.
6. Re-run the webhook delivery from Stripe dashboard → no duplicate tickets (idempotent).
*/
