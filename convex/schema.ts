// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  tickets: defineTable({
    owner: v.string(),          // Clerk tokenIdentifier
    eventId: v.string(),
    stripeEventId: v.string(),  // Stripe event.id for idempotency
    status: v.string(),         // "active" | "redeemed" | "expired"
    createdAt: v.number(),      // Date.now()
  }).index("byStripeEventId", ["stripeEventId"]),

  messages: defineTable({
    author: v.string(),     // Clerk tokenIdentifier
    body: v.string(),
    createdAt: v.number(),  // ms epoch
  })
    .index("by_author", ["author"])
    .index("by_author_createdAt", ["author", "createdAt"]),
});
