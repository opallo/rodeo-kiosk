import { query } from './_generated/server'

export const getForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    // set the user id
    const identity = await ctx.auth.getUserIdentity()
    // if there is no user id, return []
    if (identity === null) {
      return []
    }
    // pull the user data, filtered by identity.email
    return await ctx.db
      .query('messages')
      .filter((q) => q.eq(q.field('author'), identity.tokenIdentifier))
      .collect()
  },
})
