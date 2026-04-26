import type { Card, City, Name, User, Category, PlaceType } from './supabase'

const BASE = '/api'

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

// Auth
export function getMe(): Promise<User> {
  return req('/auth/me')
}

export function getNicknames(): Promise<string[]> {
  return req('/auth/nicknames')
}

export function logout(): Promise<void> {
  return req('/auth/logout', { method: 'POST' })
}

// Cards
export function getCards(): Promise<Card[]> {
  return req('/cards')
}

export function createCard(data: { category: string; title: string; city_id: string | null }): Promise<Card> {
  return req('/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export function updateCard(id: string, data: { category: string; title: string; city_id: string | null }): Promise<void> {
  return req(`/cards/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export function deleteCard(id: string): Promise<void> {
  return req(`/cards/${id}`, { method: 'DELETE' })
}

export function deletePhoto(cardId: string, photoId: string): Promise<void> {
  return req(`/cards/${cardId}/photos/${photoId}`, { method: 'DELETE' })
}

export function replacePlaces(
  cardId: string,
  places: Array<{ name: string; type: string; lat?: number | null; lng?: number | null }>
): Promise<void> {
  return req(`/cards/${cardId}/places`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(places),
  })
}

export function uploadPhoto(
  cardId: string,
  file: File,
  order: number,
  visibility: 'public' | 'private' = 'public',
): Promise<{ url: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('order', String(order))
  form.append('visibility', visibility)
  return req(`/cards/${cardId}/photos`, { method: 'POST', body: form })
}

// Cities
export function getCities(): Promise<City[]> {
  return req('/cities')
}

export async function findOrCreateCity(
  name: string,
  lat: number | null,
  lng: number | null
): Promise<City> {
  const results = await req<City[]>(`/cities?search=${encodeURIComponent(name)}`)
  if (results.length > 0) return results[0]
  return req('/cities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, lat, lng }),
  })
}

// Categories
export function getCategories(): Promise<Category[]> {
  return req('/categories')
}
export function createCategory(data: { id: string; label: string; emoji: string; sort_order: number }): Promise<Category> {
  return req('/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
}
export function deleteCategory(id: string): Promise<void> {
  return req(`/categories/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// PlaceTypes
export function getPlaceTypes(): Promise<PlaceType[]> {
  return req('/place-types')
}
export function createPlaceType(data: { id: string; label: string; color: string; sort_order: number }): Promise<PlaceType> {
  return req('/place-types', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
}
export function deletePlaceType(id: string): Promise<void> {
  return req(`/place-types/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// Names
export function getNames(): Promise<Name[]> {
  return req('/names')
}

export function createName(name: string): Promise<Name> {
  return req('/names', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}
