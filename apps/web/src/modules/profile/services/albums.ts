import { request } from '@/plugins/http'

export type Album = {
  id: string
  ownerId: string
  name: string
  privacy: 'PUBLIC' | 'FRIENDS' | 'ONLY_ME'
  createdAt: string
  photos?: { id: string; url: string; caption: string }[]
  _count?: { photos: number }
}

export const albumsApi = {
  list: () => request<Album[]>('/albums'),
  forProfile: (username: string) =>
    request<Album[]>(`/users/${encodeURIComponent(username)}/albums`),
  get: (id: string) => request<Album>(`/albums/${id}`),
  create: (name: string, privacy: Album['privacy']) =>
    request<Album>('/albums', { method: 'POST', body: { name, privacy } }),
  remove: (id: string) => request<void>(`/albums/${id}`, { method: 'DELETE' }),
  removePhoto: (id: string, photoId: string) =>
    request<void>(`/albums/${id}/photos/${photoId}`, { method: 'DELETE' }),
  addPhotos: (id: string, files: File[]) => {
    const form = new FormData()
    for (const file of files) form.append('files', file)
    return request(`/albums/${id}/photos`, { method: 'POST', body: form })
  },
}
