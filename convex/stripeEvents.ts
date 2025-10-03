// convex/stripeEvents.ts
import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const take = limit ?? 10;
    return await ctx.db
      .query("stripeEvents")
      .order("desc")
      .take(take);
  },
});

export const ingest = internalMutation({
  args: {
    eventId: v.string(),
    type: v.string(),
    created: v.number(),
    sessionId: v.string(),
    clientReferenceId: v.optional(v.string()),
    raw: v.string(),
  },
  handler: async (
    ctx,
    { eventId, type, created, sessionId, clientReferenceId, raw }
  ) => {
    const existing = await ctx.db
      .query("stripeEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .first();

    if (existing) {
      return { inserted: false, id: existing._id };
    }

    const insertedId = await ctx.db.insert("stripeEvents", {
      eventId,
      type,
      created,
      sessionId,
      clientReferenceId,
      raw,
    });

    return { inserted: true, id: insertedId };
  },
});
