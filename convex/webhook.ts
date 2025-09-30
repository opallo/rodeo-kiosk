// Notes for developer:
// - Prefer using the Stripe webhook via convex/http.ts; this action is kept for form-based triggers.
// - Calls into tickets.* must go through generated internal references.

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

export const issueTickets = action({
  args: {
    secret: v.string(),
    owner: v.string(),
    eventId: v.string(),
    quantity: v.number(),
    stripeEventId: v.string(),
  },
  handler: async (ctx, args) => {
    const expected = process.env.FORM_ACTION_SECRET;
    if (!expected || args.secret !== expected) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.runQuery(api.tickets.findByStripeEventId, {
      stripeEventId: args.stripeEventId,
    });
    if (existing) {
      return { ok: true, alreadyProcessed: true };
    }

    const { minted } = await ctx.runMutation(internal.tickets.insertMany, {
      owner: args.owner,
      eventId: args.eventId,
      stripeEventId: args.stripeEventId,
      quantity: args.quantity,
    });

    return { ok: true, minted };
  },
});
