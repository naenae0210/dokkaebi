import { useState, useCallback, useEffect } from 'react'
import * as api from '../lib/api'
import type { Card, City, Category, PlaceType } from '../lib/supabase'

const PAGE_SIZE = 20

export function useAppData(filters: { cityId: string; category: string }) {
  const [cards, setCards] = useState<Card[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [cities, setCities] = useState<City[]>([])
  const [nicknames, setNicknames] = useState<string[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([])

  const cityId = filters.cityId !== 'all' ? filters.cityId : undefined
  const category = filters.category !== 'all' ? filters.category : undefined

  // Reset and reload cards when filters change
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.getCards({ limit: PAGE_SIZE, offset: 0, cityId, category })
      .then(res => {
        if (cancelled) return
        setCards(res.cards)
        setTotal(res.total)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [cityId, category])

  // Load static data once
  useEffect(() => {
    Promise.allSettled([
      api.getCities(),
      api.getNicknames(),
      api.getCategories(),
      api.getPlaceTypes(),
    ]).then(([cityRes, nicknameRes, catRes, ptRes]) => {
      if (cityRes.status === 'fulfilled') setCities(cityRes.value)
      if (nicknameRes.status === 'fulfilled') setNicknames(nicknameRes.value)
      if (catRes.status === 'fulfilled') setCategories(catRes.value)
      if (ptRes.status === 'fulfilled') setPlaceTypes(ptRes.value)
    })
  }, [])

  // Called after create/edit/delete/photo — reload from page 1
  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getCards({ limit: PAGE_SIZE, offset: 0, cityId, category })
      setCards(res.cards)
      setTotal(res.total)
    } catch {}
    finally { setLoading(false) }
  }, [cityId, category])

const loadMore = useCallback(async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await api.getCards({ limit: PAGE_SIZE, offset: cards.length, cityId, category })
      setCards(prev => [...prev, ...res.cards])
      setTotal(res.total)
    } catch {}
    finally { setLoading(false) }
  }, [loading, cards.length, cityId, category])

  const hasMore = cards.length < total

  return { cards, cities, nicknames, categories, placeTypes, reload, loadMore, hasMore, loading, total }
}
