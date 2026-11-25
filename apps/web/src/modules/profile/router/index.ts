// `/:username` menangkap semua segmen (karena itu daftar username terlarang);
// global-routes menaruh rute dinamis di akhir, jadi urutan glob tidak berpengaruh.
export default [
  {
    path: '/events',
    name: 'events',
    component: () => import('@/modules/events/pages/EventsView.vue'),
    meta: { app: true },
  },
  {
    path: '/events/:id',
    name: 'event-detail',
    component: () => import('@/modules/events/pages/EventDetailView.vue'),
    meta: { app: true },
  },
  {
    path: '/groups',
    name: 'groups',
    component: () => import('@/modules/groups/pages/GroupsView.vue'),
    meta: { app: true },
  },
  {
    path: '/groups/:id',
    name: 'group-detail',
    component: () => import('@/modules/groups/pages/GroupDetailView.vue'),
    meta: { app: true },
  },
  {
    path: '/albums',
    name: 'albums',
    component: () => import('@/modules/profile/pages/AlbumsView.vue'),
    meta: { app: true },
  },
  {
    path: '/albums/:id',
    name: 'album-detail',
    component: () => import('@/modules/profile/pages/AlbumDetailView.vue'),
    meta: { app: true },
  },
  {
    path: '/me/edit',
    name: 'profile-edit',
    component: () => import('@/modules/profile/pages/EditProfileView.vue'),
    meta: { app: true },
  },
  {
    path: '/me/privacy',
    name: 'profile-privacy',
    component: () => import('@/modules/profile/pages/PrivacySettingsView.vue'),
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
      {
        path: 'notes',
        name: 'profile-notes',
        component: () => import('@/modules/profile/pages/ProfileNotes.vue'),
      },
    ],
  },
]
