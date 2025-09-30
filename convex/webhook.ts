// convex/webhook.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { findByStripeEventId, insertMany } from "./tickets";

export const issueTickets = action({
  args: {
    secret: v.string(),
    owner: v.string(),         // Clerk tokenIdentifier
    eventId: v.string(),
    quantity: v.number(),
    stripeEventId: v.string(), // Stripe event.id (idempotency key)
  },
  handler: async (ctx, args) => {
    // 1) shared-secret check
    const expected = process.env.FORM_ACTION_SECRET;
    if (!expected || args.secret !== expected) {
      throw new Error("Unauthorized");
    }

    // 2) idempotency check in a QUERY
    const existing = await ctx.runQuery(findByStripeEventId, {
      stripeEventId: args.stripeEventId,
    });
    if (existing) return { ok: true, alreadyProcessed: true };

    // 3) mint via a MUTATION
    const { minted } = await ctx.runMutation(insertMany, {
      owner: args.owner,
      eventId: args.eventId,
      stripeEventId: args.stripeEventId,
      quantity: args.quantity,
    });

    return { ok: true, minted };
  },
});
