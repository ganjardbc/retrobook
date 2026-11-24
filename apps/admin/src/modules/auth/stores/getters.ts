export const getters = {
  isLoggedIn: (state: { user: unknown }) => state.user !== null,
}
