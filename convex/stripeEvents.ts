// convex/stripeEvents.ts
import { query, internalMutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// List the most recent ingested Stripe events (for your admin/debug UI)
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const take = limit ?? 10;
    return await ctx.db.query("stripeEvents").order("desc").take(take);
  },
});

// INTERNAL mutation: writes a Stripe event to the DB.
// - Idempotent by eventId (uses index "by_eventId")
export const ingest = internalMutation({
  args: {
    eventId: v.string(),
    type: v.string(),
    created: v.number(),
    sessionId: v.string(),
    clientReferenceId: v.optional(v.string()),
    raw: v.string(), // required here by design
  },
  handler: async (
    ctx,
    { eventId, type, created, sessionId, clientReferenceId, raw }
  ) => {
    // Idempotency: skip insert if we already saw this eventId
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

// PUBLIC action: called from Next.js webhook.
// - Verifies a shared secret (CONVEX_INGEST_TOKEN)
// - Forwards to the internal mutation
export const ingestAction = action({
  args: {
    eventId: v.string(),
    type: v.string(),
    created: v.number(),
    sessionId: v.string(),
    clientReferenceId: v.optional(v.string()),
    raw: v.optional(v.string()), // optional here; we coalesce below
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const expected = process.env.CONVEX_INGEST_TOKEN;
    if (!expected || args.token !== expected) {
      throw new Error("Unauthorized");
    }

    await ctx.runMutation(internal.stripeEvents.ingest, {
      eventId: args.eventId,
      type: args.type,
      created: args.created,
      sessionId: args.sessionId,
      clientReferenceId: args.clientReferenceId,
      raw: args.raw ?? "", // ensure string for internal mutation
    });
  },
});
