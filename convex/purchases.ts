// convex/purchases.ts
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

type PaymentStatus =
  | "paid"
  | "unpaid"
  | "no_payment_required"
  | "processing"
  | "failed";

export const ensureBySession = internalMutation({
  args: {
    stripeSessionId: v.string(),
    eventId: v.string(),
    tokenIdentifier: v.string(),
    amountTotal: v.optional(v.number()),
    currency: v.optional(v.string()),
    paymentStatus: v.union(
      v.literal("paid"),
      v.literal("unpaid"),
      v.literal("no_payment_required"),
      v.literal("processing"),
      v.literal("failed")
    ),
    customerId: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  },
  handler: async (
    ctx,
    {
      stripeSessionId,
      eventId,
      tokenIdentifier,
      amountTotal,
      currency,
      paymentStatus,
      customerId,
      createdAt,
    },
  ) => {
    const existing = await ctx.db
      .query("purchases")
      .withIndex("by_session", (q) => q.eq("stripeSessionId", stripeSessionId))
      .first();

    const normalizedAmount = amountTotal ?? 0;
    const normalizedCurrency = currency ?? "usd";
    const normalizedCreatedAt = createdAt ?? Date.now();

    if (existing) {
      const updates: Partial<{
        eventId: string;
        tokenIdentifier: string;
        amountTotal: number;
        currency: string;
        paymentStatus: PaymentStatus;
        customerId?: string;
      }> = {};

      if (existing.eventId !== eventId) {
        updates.eventId = eventId;
      }
      if (existing.tokenIdentifier !== tokenIdentifier) {
        updates.tokenIdentifier = tokenIdentifier;
      }
      if (existing.amountTotal !== normalizedAmount) {
        updates.amountTotal = normalizedAmount;
      }
      if (existing.currency !== normalizedCurrency) {
        updates.currency = normalizedCurrency;
      }
      if (existing.paymentStatus !== paymentStatus) {
        updates.paymentStatus = paymentStatus;
      }
      if (existing.customerId !== customerId) {
        updates.customerId = customerId;
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existing._id, updates);
      }

      return existing._id;
    }

    const insertedId = await ctx.db.insert("purchases", {
      stripeSessionId,
      eventId,
      tokenIdentifier,
      amountTotal: normalizedAmount,
      currency: normalizedCurrency,
      paymentStatus,
      customerId,
      createdAt: normalizedCreatedAt,
    });

    return insertedId;
  },
});
