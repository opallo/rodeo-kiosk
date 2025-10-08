// convex/ticketsActions.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// The action will always return this shape
type MintResult = {
  mintedCount: number;
  tickets: { ticketId: string; _id: Id<"tickets"> }[];
};

export const mintFromCheckoutSessionAction = action({
  args: {
    sessionId: v.string(),
    eventId: v.string(),
    tokenIdentifier: v.string(),
    amountTotal: v.number(),
    currency: v.string(),
    created: v.number(), // seconds epoch from Stripe event
    quantity: v.optional(v.number()),
    token: v.string(),   // CONVEX_MINT_TOKEN
  },
  // 👇 key fix: explicitly type the handler's Promise return
  handler: async (ctx, args): Promise<MintResult> => {
    const expected = process.env.CONVEX_MINT_TOKEN;
    if (!expected || args.token !== expected) throw new Error("Unauthorized");

    const quantity =
      typeof args.quantity === "number" && Number.isFinite(args.quantity) && args.quantity > 0
        ? args.quantity
        : 1;

    // 👇 and (optionally) annotate the mutation result too
    const result: MintResult = await ctx.runMutation(
      internal.tickets.mintFromCheckoutSession,
      {
        sessionId: args.sessionId,
        eventId: args.eventId,
        tokenIdentifier: args.tokenIdentifier,
        amountTotal: args.amountTotal,
        currency: args.currency,
        created: args.created,
        quantity,
      }
    );
    return result;
  },
});

// Action return shape (mirrors the internal mutation's result)
type RedeemOk  = { ok: true;  code: "ok"; ticketId: string };
type RedeemErr = { ok: false; code: "invalid" | "already_used" | "void" | "refunded" };
type RedeemResult = RedeemOk | RedeemErr;

export const redeemTicketAction = action({
  args: {
    ticketId: v.string(),
    kioskId: v.string(),
    token: v.string(),           // CONVEX_REDEEM_TOKEN
    ip: v.optional(v.string()),  // optional pass-through for audit
    userAgent: v.optional(v.string()),
  },
  
  // Explicit Promise<RedeemResult> avoids TS7022
  handler: async (ctx, args): Promise<RedeemResult> => {
    const expected = process.env.CONVEX_REDEEM_TOKEN;
    if (!expected || args.token !== expected) {
      throw new Error("Unauthorized");
    }

    // Import here to avoid top-level circular references
    const { internal } = await import("./_generated/api");

    return await ctx.runMutation(internal.tickets.redeem, {
      ticketId: args.ticketId,
      kioskId: args.kioskId,
      ip: args.ip,
      userAgent: args.userAgent,
    });
  },
});
