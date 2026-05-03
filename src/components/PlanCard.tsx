import { useState, useEffect } from 'react'
import type { CSSProperties, ChangeEvent } from 'react'
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

const actionBtn: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  fontSize: 10, fontWeight: 500,
  padding: '3px 8px', borderRadius: 6,
  background: '#F8FAFC', border: '1px solid #E2E8F0',
  color: '#64748B', cursor: 'pointer', whiteSpace: 'nowrap',
  lineHeight: 1.4,
}

const deleteConfirmBtn: CSSProperties = {
  ...actionBtn,
  background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444',
}

// Inline SVG icons (12 × 12)
function CameraIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
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

  // Sync with server data when parent reloads (e.g. after another card changes)
  const photosSig = (card.photos ?? []).map(p => p.id).join(',')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setLocalPhotos(card.photos ?? []) }, [photosSig])
  const cat = categories.find(c => c.id === card.category)
  const photos = localPhotos
  const places = card.places ?? []

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    e.stopPropagation()
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    e.target.value = ''
    setPendingFiles(files)
  }

  async function uploadWithVisibility(visibility: 'public' | 'private') {
    if (!pendingFiles) return
    const files = pendingFiles
    setPendingFiles(null)
    for (let i = 0; i < files.length; i++) {
      const photo = await uploadPhoto(card.id, files[i], localPhotos.length + i, visibility)
      // Optimistic update: new photo goes after cover (index 0), newest-first
      setLocalPhotos(prev => prev.length === 0 ? [photo] : [prev[0], photo, ...prev.slice(1)])
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

  const firstName = card.owner_nickname?.split(' ')[0]

  return (
    <>
      <div
        onClick={onClick}
        className={`border-b cursor-pointer transition-all ${
          active
            ? 'bg-[#EEF2FF] border-l-2 border-l-[#6366F1] border-[#E2E8F0]'
            : 'border-[#E2E8F0] hover:bg-slate-50'
        }`}
      >
        <div style={{ display: 'flex', alignItems: 'stretch' }}>

          {/* ── Left column ─────────────────────────────────── */}
          <div style={{
            flex: 1, minWidth: 0,
            padding: `12px 14px 10px ${active ? 12 : 14}px`,
          }}>

            {/* Category + Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <span style={{
                fontSize: 10, fontWeight: 600,
                padding: '2px 7px', borderRadius: 20,
                background: '#F1F5F9', color: '#475569',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {cat?.emoji} {card.category}
              </span>
              <span style={{
                fontSize: 13, fontWeight: 600, color: '#0F172A',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {card.title}
              </span>
            </div>

            {/* City */}
            {card.city && (
              <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 6 }}>
                📍 {card.city.name}
              </div>
            )}

            {/* Places */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {places.map((p, i) => (
                <div
                  key={p.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                  className="hover:opacity-60 transition-opacity"
                  onClick={e => { e.stopPropagation(); onPlaceClick?.(i) }}
                >
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${COLOR_CLASS[placeTypes.find(pt => pt.id === p.type)?.color ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                    {p.type}
                  </span>
                  <span style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Bottom bar: action buttons + author */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: 8, gap: 6,
            }}>
              {isOwner && (
                <div
                  style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Camera / upload */}
                  <label style={actionBtn}>
                    <CameraIcon /> Photo
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                  </label>

                  {/* Edit */}
                  <button
                    style={actionBtn}
                    onClick={e => { e.stopPropagation(); onEdit(card) }}
                  >
                    <EditIcon /> Edit
                  </button>

                  {/* Delete */}
                  {confirmDelete ? (
                    <>
                      <button style={deleteConfirmBtn} onClick={handleDeleteCard}>
                        Delete
                      </button>
                      <button style={actionBtn} onClick={() => setConfirmDelete(false)}>
                        ✕
                      </button>
                    </>
                  ) : (
                    <button
                      style={{ ...actionBtn, color: '#EF4444' }}
                      onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
                    >
                      <TrashIcon /> Delete
                    </button>
                  )}
                </div>
              )}

              {/* Author — pushed to the right */}
              {firstName && (
                <span style={{ fontSize: 10, color: '#94A3B8', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                  by {firstName}
                </span>
              )}
            </div>
          </div>

          {/* ── Right column: photo grid ────────────────────── */}
          {photos.length > 0 && (
            <div
              onClick={e => { e.stopPropagation(); setGallery(true) }}
              style={{
                width: photos.length === 1 ? '28%' : '35%',
                minWidth: 72,
                maxWidth: photos.length === 1 ? 110 : 140,
                flexShrink: 0, overflow: 'hidden',
                cursor: 'pointer',
                borderLeft: '1px solid #E2E8F0',
              }}
            >
              {photos.length === 1 ? (
                <img
                  src={photos[0].url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gridTemplateRows: photos.length === 2 ? '1fr' : '1fr 1fr',
                  gap: 1,
                  height: '100%',
                }}>
                  {photos.slice(0, 4).map((p, i) => (
                    <div key={p.id} style={{ position: 'relative', overflow: 'hidden' }}>
                      <img
                        src={p.url}
                        alt=""
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {i === 3 && photos.length > 4 && (
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'rgba(0,0,0,0.55)', color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700,
                        }}>
                          +{photos.length - 4}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Visibility picker */}
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
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
              Who can see {pendingFiles.length > 1 ? `these ${pendingFiles.length} photos` : 'this photo'}?
            </p>
            <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 20 }}>
              You can't change this later.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => uploadWithVisibility('public')}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  background: '#6366F1', color: 'white',
                  border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                🌍 Public
              </button>
              <button
                onClick={() => uploadWithVisibility('private')}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  background: '#F8FAFC', color: '#0F172A',
                  border: '1px solid #E2E8F0', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                🔒 Only Me
              </button>
            </div>
            <button
              onClick={() => setPendingFiles(null)}
              style={{ marginTop: 14, fontSize: 11, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}
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
          currentUserId={currentUserId}
          onDeletePhoto={handleDeletePhoto}
          onClose={() => setGallery(false)}
        />
      )}
    </>
  )
}
