import { useState } from 'react'
import { CATEGORIES } from '../lib/supabase'
import type { Card } from '../lib/supabase'
import { uploadPhoto } from '../lib/api'
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
  onPlaceClick?: (idx: number) => void
}

export default function PlanCard({ card, active, onClick, onEdit, onPhotoAdded, onPlaceClick }: Props) {
  const [gallery, setGallery] = useState(false)
  const cat = CATEGORIES.find(c => c.id === card.category)
  const photos = card.photos ?? []
  const places = card.places ?? []

  async function handleAddPhotos(e: React.ChangeEvent<HTMLInputElement>, cardId: string) {
    e.stopPropagation()
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    for (let i = 0; i < files.length; i++) {
      await uploadPhoto(cardId, files[i], photos.length + i)
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

          {/* 사진 버튼 */}
            <div
            style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
            onClick={e => e.stopPropagation()}
            >
            {/* 📷 — 항상 파일 선택 */}
            <label
                style={{ fontSize: 12, color: '#9CA3AF', padding: '4px 4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
                📷
                <input
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={e => handleAddPhotos(e, card.id)}
                />
            </label>

            {/* 숫자 — 사진 있을 때만, 클릭하면 갤러리 */}
            {photos.length > 0 && (
                <button
                onClick={() => setGallery(true)}
                style={{ fontSize: 11, color: '#9CA3AF', padding: '4px 2px', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                {photos.length}
                </button>
            )}
</div>

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
        <div className="flex flex-col gap-1">
          {places.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-2 cursor-pointer hover:opacity-60 transition-opacity"
              onClick={e => { e.stopPropagation(); onPlaceClick?.(i) }}
            >
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${TYPE_COLOR[p.type] ?? ''}`}>
                {p.type}
              </span>
              <span className="text-xs text-gray-600 flex-1">{p.name}</span>
              <span className="text-[10px] text-gray-300">#{i + 1}</span>
            </div>
          ))}
        </div>
        {/* 날짜 제거 */}
      </div>

      {gallery && (
        <GalleryModal
          photos={photos}
          onClose={() => setGallery(false)}
        />
      )}
    </>
  )
}