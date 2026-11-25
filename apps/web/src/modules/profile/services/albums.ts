import { request } from '@/plugins/http'

export type Album = {
  id: number
  ownerId: number
  name: string
  privacy: 'PUBLIC' | 'FRIENDS' | 'ONLY_ME'
  createdAt: string
  photos?: { id: number; url: string; caption: string }[]
  _count?: { photos: number }
}

export const albumsApi = {
  list: () => request<Album[]>('/albums'),
  forProfile: (username: string) =>
    request<Album[]>(`/users/${encodeURIComponent(username)}/albums`),
  get: (id: number) => request<Album>(`/albums/${id}`),
  create: (name: string, privacy: Album['privacy']) =>
    request<Album>('/albums', { method: 'POST', body: { name, privacy } }),
  remove: (id: number) => request<void>(`/albums/${id}`, { method: 'DELETE' }),
  removePhoto: (id: number, photoId: number) =>
    request<void>(`/albums/${id}/photos/${photoId}`, { method: 'DELETE' }),
  addPhotos: (id: number, files: File[]) => {
    const form = new FormData()
    for (const file of files) form.append('files', file)
    return request(`/albums/${id}/photos`, { method: 'POST', body: form })
  },
}
