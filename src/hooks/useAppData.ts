import { useState, useCallback, useEffect } from 'react'
import * as api from '../lib/api'
import type { Card, City, Category, PlaceType } from '../lib/supabase'

export function useAppData() {
  const [cards, setCards] = useState<Card[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [nicknames, setNicknames] = useState<string[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([])

  const reload = useCallback(async () => {
    const [cardRes, cityRes, nicknameRes, catRes, ptRes] = await Promise.allSettled([
      api.getCards(),
      api.getCities(),
      api.getNicknames(),
      api.getCategories(),
      api.getPlaceTypes(),
    ])
    if (cardRes.status === 'fulfilled') setCards(cardRes.value)
    if (cityRes.status === 'fulfilled') setCities(cityRes.value)
    if (nicknameRes.status === 'fulfilled') setNicknames(nicknameRes.value)
    if (catRes.status === 'fulfilled') setCategories(catRes.value)
    if (ptRes.status === 'fulfilled') setPlaceTypes(ptRes.value)
  }, [])

  useEffect(() => { reload() }, [reload])

  return { cards, cities, nicknames, categories, placeTypes, reload }
}
