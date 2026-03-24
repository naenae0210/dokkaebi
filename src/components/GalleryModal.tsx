import { useState } from 'react'
import type { Photo } from '../lib/supabase'

interface Props {
  photos: Photo[]
  onClose: () => void
}

export default function GalleryModal({ photos, onClose }: Props) {
  const [idx, setIdx] = useState(0)

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
        <img
          src={photos[idx].url}
          alt=""
          className="w-full max-h-[70vh] object-contain rounded-xl"
        />

        {/* 닫기 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          ✕
        </button>

        {/* 여러 장일 때만 네비게이션 표시 */}
        {photos.length > 1 && (
          <>
            <button
              onClick={() => setIdx(i => (i - 1 + photos.length) % photos.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full w-9 h-9 flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              ‹
            </button>
            <button
              onClick={() => setIdx(i => (i + 1) % photos.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full w-9 h-9 flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              ›
            </button>

            {/* 하단 점 네비게이션 */}
            <div className="flex justify-center gap-1.5 mt-3">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === idx ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}