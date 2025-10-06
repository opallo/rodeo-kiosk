// convex/stripeFulfillment.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

type PaymentStatus =
  | "paid"
  | "unpaid"
  | "no_payment_required"
  | "processing"
  | "failed";

export const fulfillCheckoutFromWebhook = action({
  args: {
    token: v.string(),
    stripeSessionId: v.string(),
    userId: v.string(),
    eventId: v.string(),
    quantity: v.number(),
    amountTotal: v.optional(v.number()),
    currency: v.optional(v.string()),
    paymentStatus: v.optional(
      v.union(
        v.literal("paid"),
        v.literal("unpaid"),
        v.literal("no_payment_required"),
        v.literal("processing"),
        v.literal("failed")
      )
    ),
    customerId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ purchaseId: Id<"purchases">; createdCount: number }> => {
    const expected = process.env.CONVEX_INGEST_TOKEN;
    if (!expected || args.token !== expected) {
      throw new Error("Unauthorized");
    }

    if (args.quantity <= 0 || !Number.isInteger(args.quantity)) {
      throw new Error("quantity must be a positive integer");
    }

    const paymentStatus: PaymentStatus = args.paymentStatus ?? "unpaid";

    const purchaseId = await ctx.runMutation(internal.purchases.ensureBySession, {
      stripeSessionId: args.stripeSessionId,
      eventId: args.eventId,
      tokenIdentifier: args.userId,
      amountTotal: args.amountTotal ?? 0,
      currency: args.currency ?? "usd",
      paymentStatus,
      customerId: args.customerId,
      createdAt: Date.now(),
    });

    const ticketResult = await ctx.runMutation(internal.tickets.createForPurchase, {
      userId: args.userId,
      eventId: args.eventId,
      quantity: args.quantity,
      stripeSessionId: args.stripeSessionId,
      purchaseId,
    });

    return { purchaseId, createdCount: ticketResult.count };
  },
});
