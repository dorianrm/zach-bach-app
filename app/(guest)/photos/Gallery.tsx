'use client';

import { useState } from 'react';
import { Button } from '@/components/Button';

export type GalleryPhoto = { id: string; thumbUrl: string; fullUrl: string; caption: string | null; by: string };

// Thumbnails in a two-column grid, each with its uploader and caption. Tap for full size.
// Plain <img> tags: photos are already resized, and next/image would use Vercel's image quota.
export function Gallery({ photos }: { photos: GalleryPhoto[] }) {
  const [open, setOpen] = useState<GalleryPhoto | null>(null);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3">
        {photos.map((photo) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setOpen(photo)}
              aria-label={`Photo by ${photo.by}${photo.caption ? `: ${photo.caption}` : ''}`}
              className="flex w-full flex-col gap-1.5 text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.thumbUrl} alt="" loading="lazy" className="aspect-square w-full rounded-xl bg-card object-cover" />
              <span className="truncate text-[13px] font-semibold text-text">{photo.by}</span>
              {photo.caption && <span className="line-clamp-2 text-[13px] leading-snug text-body">{photo.caption}</span>}
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photo by ${open.by}`}
          className="fixed inset-0 z-10 flex flex-col bg-bg pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        >
          <div className="flex min-h-0 flex-1 items-center justify-center">
            {/* Long-press saves it on a phone. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={open.fullUrl} alt={open.caption ?? `Photo by ${open.by}`} className="max-h-full max-w-full object-contain" />
          </div>
          <div className="mx-auto flex w-full max-w-xl items-end justify-between gap-4 px-6 py-4">
            <p className="flex min-w-0 flex-col gap-1">
              <span className="text-[15px] font-semibold text-text">{open.by}</span>
              {open.caption && <span className="text-[15px] leading-normal text-body">{open.caption}</span>}
            </p>
            <Button variant="secondary" onClick={() => setOpen(null)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
