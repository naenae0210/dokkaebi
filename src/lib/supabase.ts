export interface PlaceType {
  id: string
  label: string
  color: string
  sort_order: number
}

export interface Category {
  id: string
  label: string
  emoji: string
  sort_order: number
}

export interface User {
  id: string
  email: string
  nickname: string
  avatar_url?: string | null
  provider: string
  created_at?: string
  updated_at?: string
}

export interface Name {
  id: string
  name: string
  created_at?: string
}

export interface City {
  id: string
  name: string
  country: string
  lat?: number | null
  lng?: number | null
  created_at?: string
  updated_at?: string
}

export interface Place {
  id?: string
  card_id?: string
  name: string
  type: string
  lat?: number | null
  lng?: number | null
  created_at?: string
  updated_at?: string
}

export interface Photo {
  id?: string
  card_id?: string
  url: string
  order: number
  visibility: 'public' | 'private'
  created_at?: string
  updated_at?: string
}

export interface Card {
  id: string
  user_id?: string | null
  city_id?: string | null
  city?: City
  category: string
  title: string
  cover_photo?: string | null
  visibility: 'public' | 'private'
  owner_nickname?: string | null
  created_at: string
  updated_at: string
  places?: Place[]
  photos?: Photo[]
}


export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}
