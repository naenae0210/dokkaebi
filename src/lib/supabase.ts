export type PlaceType = 'Restaurant' | 'Cafe' | 'Activity'

export type Category =
  | 'Beach' | 'City' | 'Culture' | 'Shopping'
  | 'Nature' | 'Nightout' | 'Work' | 'Themepark'

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
  type: PlaceType
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
  created_at?: string
  updated_at?: string
}

export interface Card {
  id: string
  city_id?: string | null
  city?: City
  category: Category
  title: string
  cover_photo?: string | null
  created_at: string
  updated_at: string
  places?: Place[]
  photos?: Photo[]
}

export const CATEGORIES: { id: Category; emoji: string; label: string }[] = [
  { id: 'Beach',     emoji: '🏖', label: 'Beach'     },
  { id: 'City',      emoji: '🏙', label: 'City'      },
  { id: 'Culture',   emoji: '🎨', label: 'Culture'   },
  { id: 'Shopping',  emoji: '🛍', label: 'Shopping'  },
  { id: 'Nature',    emoji: '🌿', label: 'Nature'    },
  { id: 'Nightout', emoji: '🌙', label: 'Nightout' },
  { id: 'Work',      emoji: '💻', label: 'Work'      },
  { id: 'Themepark', emoji: '🎢', label: 'Themepark' },
]

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}