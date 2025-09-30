// Notes for developer:
// - Configure Convex env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
// - Configure Next.js env vars: STRIPE_SECRET_KEY, NEXT_PUBLIC_SITE_URL.
// - Point Stripe webhook to https://<DEPLOYMENT>.convex.site/stripe for checkout.session.completed.

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tickets: defineTable({
    owner: v.string(), // Clerk tokenIdentifier
    eventId: v.string(),
    stripeEventId: v.string(), // Stripe event.id for idempotency
    status: v.string(), // "active" | "redeemed" | "expired"
    createdAt: v.number(), // Date.now()
  }).index("byStripeEventId", ["stripeEventId"]),

  messages: defineTable({
    author: v.string(), // Clerk tokenIdentifier
    body: v.string(),
    createdAt: v.number(), // ms epoch
  })
    .index("by_author", ["author"])
    .index("by_author_createdAt", ["author", "createdAt"]),
});
