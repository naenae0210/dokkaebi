import { useEffect, useRef, useState } from 'react'

export interface Prediction {
  place_id: string
  description: string
  structured_formatting?: { main_text: string }
}

export function usePlacesAutocomplete(types: string[]) {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const autocompleteService = useRef<any>(null)
  const placesService = useRef<any>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      const google = (window as any).google
      if (!google?.maps?.places) return
      clearInterval(interval)
      autocompleteService.current = new google.maps.places.AutocompleteService()
      placesService.current = new google.maps.places.PlacesService(document.createElement('div'))
    }, 100)
    return () => clearInterval(interval)
  }, [])

  function search(input: string, maxResults?: number) {
    if (!input.trim()) {
      setPredictions([])
      setShowDropdown(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!autocompleteService.current) return
      autocompleteService.current.getPlacePredictions(
        { input, types },
        (results: any[], status: string) => {
          if (status === 'OK' && results) {
            const list = maxResults ? results.slice(0, maxResults) : results
            setPredictions(list.map(r => ({
              place_id: r.place_id,
              description: r.description,
              structured_formatting: r.structured_formatting,
            })))
            setShowDropdown(true)
          } else {
            setPredictions([])
            setShowDropdown(false)
          }
        }
      )
    }, 300)
  }

  function getDetails(placeId: string, fields = ['geometry', 'name']): Promise<{ lat: number | null; lng: number | null; name?: string }> {
    return new Promise(resolve => {
      if (!placesService.current) return resolve({ lat: null, lng: null })
      placesService.current.getDetails(
        { placeId, fields },
        (place: any, status: string) => {
          if (status !== 'OK') return resolve({ lat: null, lng: null })
          resolve({
            lat: place?.geometry?.location?.lat() ?? null,
            lng: place?.geometry?.location?.lng() ?? null,
            name: place?.name,
          })
        }
      )
    })
  }

  return { predictions, showDropdown, setShowDropdown, search, getDetails }
}
