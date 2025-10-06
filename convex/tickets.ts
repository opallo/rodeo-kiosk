// convex/tickets.ts
import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// PUBLIC QUERY: read a ticket by its Stripe Checkout Session id
export const getBySessionId = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const ticket = await ctx.db
      .query("tickets")
      .withIndex("by_session", (q) => q.eq("stripeSessionId", sessionId))
      .first();

    if (!ticket) return null;
    return {
      id: ticket._id,
      ticketId: ticket.ticketId,
      eventId: ticket.eventId,
      status: ticket.status,
      issuedAt: ticket.issuedAt,
    };
  },
});

// INTERNAL MUTATION: mint a ticket for a paid Checkout Session (idempotent by sessionId)
export const mintFromCheckoutSession = internalMutation({
  args: {
    sessionId: v.string(),       // Stripe Checkout Session id (cs_...)
    eventId: v.string(),         // your internal event key
    tokenIdentifier: v.string(), // Clerk tokenIdentifier (owner)
    amountTotal: v.number(),     // cents
    currency: v.string(),        // "usd"
    created: v.number(),         // Stripe event.created (seconds epoch)
  },
  handler: async (ctx, args) => {
    console.log("[tickets.mint] start", {
      sessionId: args.sessionId,
      eventId: args.eventId,
      amountTotal: args.amountTotal,
      currency: args.currency,
      created: args.created,
    });
    // Idempotency: if a ticket already exists for this session, return it.
    const existingTicket = await ctx.db
      .query("tickets")
      .withIndex("by_session", (q) => q.eq("stripeSessionId", args.sessionId))
      .first();
    if (existingTicket) {
      console.log("[tickets.mint] already minted", {
        sessionId: args.sessionId,
        ticketId: existingTicket.ticketId,
        _id: existingTicket._id,
      });
      return { minted: false, ticketId: existingTicket.ticketId, _id: existingTicket._id };
    }

    // Also upsert a purchase row keyed by session
    const existingPurchase = await ctx.db
      .query("purchases")
      .withIndex("by_session", (q) => q.eq("stripeSessionId", args.sessionId))
      .first();

    // Simple unguessable ticket code (demo). Swap to crypto if you prefer.
    const ticketCode =
      Math.random().toString(36).slice(2, 12) +
      Math.random().toString(36).slice(2, 12);

    const nowMs = Date.now();

    const ticketDocId = await ctx.db.insert("tickets", {
      ticketId: ticketCode,
      eventId: args.eventId,
      ownerTokenIdentifier: args.tokenIdentifier,
      emailSnapshot: undefined,
      stripeSessionId: args.sessionId,
      status: "active",
      validFrom: undefined,
      validTo: undefined,
      issuedAt: nowMs,
      redeemedAt: undefined,
      redeemedByKioskId: undefined,
      emailSentAt: undefined,
      emailProviderMessageId: undefined,
    });

    if (!existingPurchase) {
      await ctx.db.insert("purchases", {
        stripeSessionId: args.sessionId,
        eventId: args.eventId,
        tokenIdentifier: args.tokenIdentifier,
        amountTotal: args.amountTotal,
        currency: args.currency,
        paymentStatus: "paid",
        customerId: undefined,
        createdAt: args.created * 1000, // s → ms
        ticketId: ticketCode,
      });
    } else if (!existingPurchase.ticketId) {
      await ctx.db.patch(existingPurchase._id, {
        ticketId: ticketCode,
        paymentStatus: "paid",
      });
    }

    console.log("[tickets.mint] minted", {
      sessionId: args.sessionId,
      ticketId: ticketCode,
      ticketDocId,
    });

    // If you upsert/patch purchases, logging there helps too:
    console.log("[tickets.mint] purchase upserted/updated", { sessionId: args.sessionId });

    return { minted: true, ticketId: ticketCode, _id: ticketDocId };
  },
});
