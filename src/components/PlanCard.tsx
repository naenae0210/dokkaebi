import { useState } from 'react'
import { supabase, CATEGORIES, formatDate } from '../lib/supabase'
import type { Card } from '../lib/supabase'
import GalleryModal from './GalleryModal'

const TYPE_COLOR: Record<string, string> = {
  Activity:   'bg-purple-100 text-purple-700',
  Restaurant: 'bg-green-100 text-green-700',
  Cafe:       'bg-amber-100 text-amber-700',
}

interface Props {
  card: Card
  active: boolean
  onClick: () => void
  onEdit: (card: Card) => void
  onPhotoAdded: () => void
}

export default function PlanCard({ card, active, onClick, onEdit, onPhotoAdded }: Props) {
  const [gallery, setGallery] = useState(false)
  const cat = CATEGORIES.find(c => c.id === card.category)
  const photos = card.photos ?? []
  const places = card.places ?? []
  const isEdited = card.updated_at !== card.created_at

  async function handleAddPhotos(e: React.ChangeEvent<HTMLInputElement>, cardId: string) {
    e.stopPropagation()
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = file.name.split('.').pop()
      const path = `${cardId}/${Date.now()}-${i}.${ext}`

      const { data: upload } = await supabase.storage
        .from('place-galleries')
        .upload(path, file)

      if (upload) {
        const { data: { publicUrl } } = supabase.storage
          .from('place-galleries')
          .getPublicUrl(path)

        await supabase.from('photos').insert({
          card_id: cardId,
          url: publicUrl,
          order: photos.length + i
        })

        // 첫 사진이면 커버로
        if (i === 0 && !card.cover_photo) {
          await supabase.from('cards')
            .update({ cover_photo: publicUrl })
            .eq('id', cardId)
        }
      }
    }
    onPhotoAdded()
  }

  return (
    <>
      <div
        onClick={onClick}
        className={`px-5 py-4 border-b border-gray-100 cursor-pointer transition-all ${
          active
            ? 'bg-[#FDF3E9] border-l-2 border-l-[#C8773A] pl-[18px]'
            : 'hover:bg-gray-50'
        }`}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {cat?.emoji} {card.category}
          </span>
          <span className="text-sm font-medium text-gray-900 flex-1">
            {card.title}
          </span>

          {/* 사진 버튼 — 있으면 갤러리, 없으면 업로드 */}
          {photos.length > 0 ? (
            <button
              onClick={e => { e.stopPropagation(); setGallery(true) }}
              className="text-gray-300 hover:text-green-400 transition-colors text-sm flex-shrink-0"
            >
              📷 {photos.length}
            </button>
          ) : (
            <label
              className="text-gray-300 hover:text-green-400 transition-colors text-sm flex-shrink-0 cursor-pointer"
              onClick={e => e.stopPropagation()}
            >
              📷
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => handleAddPhotos(e, card.id)}
              />
            </label>
          )}

          {/* 수정 버튼 */}
          <button
            onClick={e => { e.stopPropagation(); onEdit(card) }}
            className="text-gray-300 hover:text-blue-400 transition-colors text-sm flex-shrink-0"
          >
            ✎
          </button>
        </div>

        {/* 도시 */}
        {card.city && (
          <div className="text-xs text-gray-400 mb-1.5">
            📍 {card.city.name}
          </div>
        )}

        {/* 장소 목록 */}
        <div className="flex flex-col gap-1 mb-2">
          {places.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${TYPE_COLOR[p.type] ?? ''}`}>
                {p.type}
              </span>
              <span className="text-xs text-gray-600">{p.name}</span>
            </div>
          ))}
        </div>

        {/* 날짜 */}
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-[10px] text-gray-300">
            {formatDate(card.created_at)}
          </span>
          {isEdited && (
            <span className="text-[10px] text-gray-300">
              · edited {formatDate(card.updated_at)}
            </span>
          )}
        </div>
      </div>

      {/* 갤러리 모달 */}
      {gallery && (
        <GalleryModal
          photos={photos}
          onClose={() => setGallery(false)}
        />
      )}
    </>
  )
}