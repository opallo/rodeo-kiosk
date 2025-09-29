// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  messages: defineTable({
    author: v.string(),     // Clerk tokenIdentifier
    body: v.string(),
    createdAt: v.number(),  // ms epoch
  })
    .index("by_author", ["author"])
    .index("by_author_createdAt", ["author", "createdAt"]),


  // One row per issued ticket (the thing the buyer receives)
  tickets: defineTable({
    ticketId: v.string(),                 // random, unguessable (QR payload)
    eventId: v.string(),                  // your internal event key
    ownerTokenIdentifier: v.string(),     // Clerk stable owner key
    emailSnapshot: v.optional(v.string()),// optional: email used for the send
    stripeSessionId: v.string(),          // Stripe session that minted this
    status: v.union(
      v.literal("active"),
      v.literal("used"),
      v.literal("void"),
      v.literal("refunded")
    ),
    validFrom: v.optional(v.number()),    // ms epoch, optional timebox
    validTo: v.optional(v.number()),      // ms epoch, optional timebox
    issuedAt: v.number(),                 // ms epoch
    redeemedAt: v.optional(v.number()),   // ms epoch
    redeemedByKioskId: v.optional(v.string()),
    emailSentAt: v.optional(v.number()),
    emailProviderMessageId: v.optional(v.string())
  })
    .index("by_ticketId", ["ticketId"])
    .index("by_owner", ["ownerTokenIdentifier"])
    .index("by_session", ["stripeSessionId"])
    .index("by_event_status", ["eventId", "status"]),

  // One row per Stripe Checkout Session we care about (idempotency + reporting)
  purchases: defineTable({
    stripeSessionId: v.string(),          // unique in practice (enforced by code)
    eventId: v.string(),
    tokenIdentifier: v.string(),          // who paid
    amountTotal: v.number(),              // cents
    currency: v.string(),                 // "usd"
    paymentStatus: v.union(
      v.literal("paid"),
      v.literal("unpaid"),
      v.literal("no_payment_required"),
      v.literal("processing"),
      v.literal("failed")
    ),
    customerId: v.optional(v.string()),   // Stripe customer id
    createdAt: v.number(),                // ms epoch
    ticketId: v.optional(v.string())      // back-ref after mint
  })
    .index("by_session", ["stripeSessionId"])
    .index("by_token", ["tokenIdentifier"]),

  // Stripe at-least-once safety net (dedupe + audit)
  stripeEvents: defineTable({
    stripeEventId: v.string(),            // event.id
    type: v.string(),                     // e.g., checkout.session.completed
    created: v.number(),                  // Stripe's event.created (s)
    firstSeenAt: v.number(),              // ms epoch
    lastHandledAt: v.optional(v.number()),
    handled: v.boolean(),
    payloadHash: v.string(),              // hash(rawBody) for audit
    sessionId: v.optional(v.string())     // extracted if present
  })
    .index("by_eventId", ["stripeEventId"])
    .index("by_sessionId", ["sessionId"]),

  // Atomic redemption trail (auditable, supports replays)
  redemptions: defineTable({
    ticketId: v.string(),
    kioskId: v.string(),
    redeemedAt: v.number(),               // ms epoch
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    result: v.union(
      v.literal("ok"),
      v.literal("already_used"),
      v.literal("invalid")
    )
  })
    .index("by_ticketId", ["ticketId"])
    .index("by_kioskId", ["kioskId"]),

  // Optional: register kiosks and gate with a hashed secret
  kiosks: defineTable({
    kioskId: v.string(),                  // human-friendly id
    label: v.optional(v.string()),
    enabled: v.boolean(),
    secretHash: v.string(),               // store only a hash
    createdAt: v.number(),
    lastSeenAt: v.optional(v.number())
  })
    .index("by_kioskId", ["kioskId"])
});
