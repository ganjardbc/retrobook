export const getters = {
  hasStats: (state: { stats: unknown }) => state.stats !== null,
}
