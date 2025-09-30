// Notes for developer:
// - Stripe env vars must be configured in Convex dashboard.
// - This internal action runs in the Node runtime ("use node").

"use node";

import Stripe from "stripe";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

export const fulfill = internalAction({
  args: {
    signature: v.string(),
    payload: v.string(),
  },
  handler: async (ctx, { signature, payload }) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secretKey || !webhookSecret) {
      throw new Error("Missing Stripe environment variables");
    }

    const stripe = new Stripe(secretKey);

    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    if (event.type !== "checkout.session.completed") {
      return { success: true, ignored: event.type };
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const stripeEventId = event.id;
    const owner = (session.client_reference_id as string | null) ?? "unknown";
    const eventId = (session.metadata?.eventId as string | undefined) ?? "general";
    const quantity = Number(session.metadata?.quantity ?? 1) || 1;

    const existing = await ctx.runQuery(api.tickets.findByStripeEventId, {
      stripeEventId,
    });
    if (existing) {
      return { success: true, alreadyProcessed: true };
    }

    await ctx.runMutation(internal.tickets.insertMany, {
      owner,
      eventId,
      stripeEventId,
      quantity,
    });

    return { success: true };
  },
});
