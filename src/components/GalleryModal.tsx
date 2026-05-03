import { useState } from 'react'
import type { Photo } from '../lib/supabase'

interface Props {
  photos: Photo[]
  cardId: string
  currentUserId?: string
  onDeletePhoto: (photoId: string) => void
  onClose: () => void
}

export default function GalleryModal({ photos, currentUserId, onDeletePhoto, onClose }: Props) {
  const [idx, setIdx] = useState(0)
  const [confirming, setConfirming] = useState(false)

  const current = photos[idx]
  const canDelete = !!currentUserId && current?.uploader_id === currentUserId

  function handleDelete() {
    if (!current?.id) return
    onDeletePhoto(current.id)
    setConfirming(false)
    if (idx >= photos.length - 1) setIdx(Math.max(0, idx - 1))
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
        <img
          src={current.url}
          alt=""
          className="w-full max-h-[70vh] object-contain rounded-xl"
        />

        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          ✕
        </button>

        {canDelete && (
          <div className="absolute top-3 left-3">
            {confirming ? (
              <div className="flex gap-2 items-center">
                <button
                  onClick={handleDelete}
                  className="text-white bg-red-500/80 rounded-full px-3 py-1 text-xs font-medium hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="text-white bg-black/50 rounded-full px-3 py-1 text-xs hover:bg-black/70 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-500/70 transition-colors text-sm"
              >
                🗑
              </button>
            )}
          </div>
        )}

        {photos.length > 1 && (
          <>
            <button
              onClick={() => { setIdx(i => (i - 1 + photos.length) % photos.length); setConfirming(false) }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full w-9 h-9 flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              ‹
            </button>
            <button
              onClick={() => { setIdx(i => (i + 1) % photos.length); setConfirming(false) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full w-9 h-9 flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              ›
            </button>

            <div className="flex justify-center gap-1.5 mt-3">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setIdx(i); setConfirming(false) }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
