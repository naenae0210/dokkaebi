import { useState } from 'react'
import type { Card, Category, PlaceType } from '../lib/supabase'
import { uploadPhoto, deleteCard, deletePhoto } from '../lib/api'
import GalleryModal from './GalleryModal'

const COLOR_CLASS: Record<string, string> = {
  green:  'bg-green-100 text-green-700',
  amber:  'bg-amber-100 text-amber-700',
  purple: 'bg-purple-100 text-purple-700',
  blue:   'bg-blue-100 text-blue-700',
  red:    'bg-red-100 text-red-700',
  gray:   'bg-gray-100 text-gray-600',
}

interface Props {
  card: Card
  categories: Category[]
  placeTypes: PlaceType[]
  active: boolean
  onClick: () => void
  onEdit: (card: Card) => void
  onPhotoAdded: () => void
  onDeleted?: () => void
  onPlaceClick?: (idx: number) => void
  currentUserId?: string
}

export default function PlanCard({ card, categories, placeTypes, active, onClick, onEdit, onPhotoAdded, onDeleted, onPlaceClick, currentUserId }: Props) {
  const [gallery, setGallery] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [localPhotos, setLocalPhotos] = useState(card.photos ?? [])
  const isOwner = !!currentUserId && card.user_id === currentUserId
  const cat = categories.find(c => c.id === card.category)
  const photos = localPhotos
  const places = card.places ?? []

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation()
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    // Reset input so the same file can be re-selected after cancel
    e.target.value = ''
    setPendingFiles(files)
  }

  async function uploadWithVisibility(visibility: 'public' | 'private') {
    if (!pendingFiles) return
    const files = pendingFiles
    setPendingFiles(null)
    for (let i = 0; i < files.length; i++) {
      await uploadPhoto(card.id, files[i], photos.length + i, visibility)
    }
    onPhotoAdded()
  }

  async function handleDeleteCard() {
    await deleteCard(card.id)
    onDeleted?.()
  }

  async function handleDeletePhoto(photoId: string) {
    await deletePhoto(card.id, photoId)
    setLocalPhotos(prev => prev.filter(p => p.id !== photoId))
    if (localPhotos.length <= 1) setGallery(false)
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
            <label
              style={{ fontSize: 12, color: '#9CA3AF', padding: '4px 4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              📷
              <input
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </label>

            {photos.length > 0 && (
              <button
                onClick={() => setGallery(true)}
                style={{ fontSize: 11, color: '#9CA3AF', padding: '4px 2px', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {photos.length}
              </button>
            )}
          </div>

          {/* 수정/삭제 버튼 — 본인 카드만 */}
          {isOwner && (
            <>
              <button
                onClick={e => { e.stopPropagation(); onEdit(card) }}
                className="text-gray-300 hover:text-blue-400 transition-colors text-sm flex-shrink-0"
              >
                ✎
              </button>
              {confirmDelete ? (
                <span className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={handleDeleteCard}
                    className="text-[10px] text-white bg-red-400 rounded px-1.5 py-0.5 hover:bg-red-500 transition-colors"
                  >
                    delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ✕
                  </button>
                </span>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
                  className="text-gray-300 hover:text-red-400 transition-colors text-sm flex-shrink-0"
                >
                  🗑
                </button>
              )}
            </>
          )}
        </div>

        {/* 도시 */}
        {card.city && (
          <div className="text-xs text-gray-400 mb-1">
            📍 {card.city.name}
          </div>
        )}

        {/* 카드 소유자 닉네임 */}
        {card.owner_nickname && (
          <div className="text-[10px] text-gray-300 mb-1.5">
            by {card.owner_nickname}
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
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${COLOR_CLASS[placeTypes.find(pt => pt.id === p.type)?.color ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                {p.type}
              </span>
              <span className="text-xs text-gray-600 flex-1">{p.name}</span>
              <span className="text-[10px] text-gray-300">#{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 사진 공개 범위 선택 */}
      {pendingFiles && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setPendingFiles(null)}
        >
          <div
            style={{
              background: 'white', borderRadius: 16,
              padding: '28px 32px', minWidth: 280,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              textAlign: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1C1B18', marginBottom: 6 }}>
              Who can see {pendingFiles.length > 1 ? `these ${pendingFiles.length} photos` : 'this photo'}?
            </p>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 20 }}>
              You can't change this later.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => uploadWithVisibility('public')}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  background: '#1C1B18', color: 'white',
                  border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                🌍 Public
              </button>
              <button
                onClick={() => uploadWithVisibility('private')}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  background: '#F5F0E8', color: '#1C1B18',
                  border: '1px solid #E0DDD8', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                🔒 Only Me
              </button>
            </div>
            <button
              onClick={() => setPendingFiles(null)}
              style={{ marginTop: 14, fontSize: 11, color: '#B0ABA6', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {gallery && photos.length > 0 && (
        <GalleryModal
          photos={photos}
          cardId={card.id}
          canDelete={isOwner}
          onDeletePhoto={handleDeletePhoto}
          onClose={() => setGallery(false)}
        />
      )}
    </>
  )
}
