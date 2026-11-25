// `/:username` menangkap semua segmen (karena itu daftar username terlarang);
// global-routes menaruh rute dinamis di akhir, jadi urutan glob tidak berpengaruh.
export default [
  {
    path: '/me/edit',
    name: 'profile-edit',
    component: () => import('@/modules/profile/pages/EditProfileView.vue'),
    meta: { app: true },
  },
  {
    path: '/me/blocked',
    name: 'blocked-people',
    component: () => import('@/modules/profile/pages/BlockedView.vue'),
    meta: { app: true },
  },
  {
    path: '/me/activity',
    name: 'activity-log',
    component: () => import('@/modules/profile/pages/ActivityLogView.vue'),
    meta: { app: true },
  },
  {
    path: '/:username',
    component: () => import('@/modules/profile/pages/ProfileView.vue'),
    meta: { app: true, layout: 'profile' },
    children: [
      {
        path: '',
        name: 'profile',
        component: () => import('@/modules/profile/pages/ProfileTimeline.vue'),
      },
      {
        path: 'about',
        name: 'profile-about',
        component: () => import('@/modules/profile/pages/ProfileAbout.vue'),
      },
      {
        path: 'friends',
        name: 'profile-friends',
        component: () => import('@/modules/profile/pages/ProfileFriends.vue'),
      },
      {
        path: 'photos',
        name: 'profile-photos',
        component: () => import('@/modules/profile/pages/ProfilePhotos.vue'),
      },
    ],
  },
]
