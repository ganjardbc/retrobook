export default [
  {
    path: '/search',
    name: 'search',
    component: () => import('@/modules/search/pages/SearchView.vue'),
    meta: { app: true },
  },
  {
    path: '/hashtag/:tag',
    name: 'hashtag',
    component: () => import('@/modules/search/pages/HashtagView.vue'),
    meta: { app: true },
  },
]
