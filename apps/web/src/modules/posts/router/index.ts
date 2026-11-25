export default [
  {
    path: '/saved',
    name: 'saved',
    component: () => import('@/modules/posts/pages/SavedView.vue'),
    meta: { app: true },
  },
  {
    path: '/on-this-day',
    name: 'on-this-day',
    component: () => import('@/modules/posts/pages/OnThisDayView.vue'),
    meta: { app: true },
  },
  {
    path: '/year-in-review',
    name: 'year-in-review',
    component: () => import('@/modules/posts/pages/YearInReviewView.vue'),
    meta: { app: true },
  },
]
