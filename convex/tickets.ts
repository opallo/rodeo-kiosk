// convex/tickets.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const findByStripeEventId = query({
  args: { stripeEventId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tickets")
      .withIndex("byStripeEventId", (q) => q.eq("stripeEventId", args.stripeEventId))
      .first();
  },
});

export const insertMany = mutation({
  args: {
    owner: v.string(),
    eventId: v.string(),
    stripeEventId: v.string(),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const { owner, eventId, stripeEventId, quantity } = args;
    const now = Date.now();
    for (let i = 0; i < quantity; i++) {
      await ctx.db.insert("tickets", {
        owner,
        eventId,
        stripeEventId,
        status: "active",
        createdAt: now,
      });
    }
    return { minted: quantity };
  },
});
