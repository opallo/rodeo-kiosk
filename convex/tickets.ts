// Notes for developer:
// - Convex env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
// - Always call these functions through ctx.runQuery/runMutation with generated references.

import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

export const findByStripeEventId = query({
  args: { stripeEventId: v.string() },
  handler: async (ctx, { stripeEventId }) => {
    return ctx.db
      .query("tickets")
      .withIndex("byStripeEventId", (q) => q.eq("stripeEventId", stripeEventId))
      .unique();
  },
});

export const insertMany = internalMutation({
  args: {
    owner: v.string(),
    eventId: v.string(),
    stripeEventId: v.string(),
    quantity: v.number(),
  },
  handler: async (ctx, { owner, eventId, stripeEventId, quantity }) => {
    const minted = Math.max(0, Math.floor(quantity));
    if (minted <= 0) {
      return { minted: 0 };
    }

    const createdAt = Date.now();
    for (let i = 0; i < minted; i += 1) {
      await ctx.db.insert("tickets", {
        owner,
        eventId,
        stripeEventId,
        status: "active",
        createdAt,
      });
    }

    return { minted };
  },
});
