// convex/ticketsPublic.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const listBySession = query({
  args: { stripeSessionId: v.string() },
  handler: async (ctx, { stripeSessionId }) => {
    return ctx.db
      .query("tickets")
      .withIndex("by_session", (q) => q.eq("stripeSessionId", stripeSessionId))
      .order("desc")
      .collect();
  },
});

export const listForOwner = query({
  args: { owner: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { owner, limit }) => {
    const take = limit ?? 10;
    return ctx.db
      .query("tickets")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", owner))
      .order("desc")
      .take(take);
  },
});
