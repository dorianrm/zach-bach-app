'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/Button';
import { Tag } from '@/components/Tag';
import { deletePhoto, setHidden, setTag } from './actions';

export type GalleryPhoto = {
  id: string;
  thumbUrl: string;
  fullUrl: string;
  caption: string | null;
  by: string;
  tag: string | null;
  hidden: boolean;
  mine: boolean;
};

// Thumbnails in a two-column grid, each with its uploader and caption. Tap for full size.
// Plain <img> tags: photos are already resized, and next/image would use Vercel's image quota.
export function Gallery({ photos, tags, isAdmin }: { photos: GalleryPhoto[]; tags: string[]; isAdmin: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  // Read from the latest server data, so a hide or a tag change shows at once. A deleted
  // photo (or one that left the current filter) closes the view.
  const open = photos.find((p) => p.id === openId);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3">
        {photos.map((photo) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setOpenId(photo.id)}
              aria-label={`Photo by ${photo.by}${photo.caption ? `: ${photo.caption}` : ''}${photo.hidden ? ', hidden' : ''}`}
              className="relative flex w-full flex-col gap-1.5 text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.thumbUrl}
                alt=""
                loading="lazy"
                className={`aspect-square w-full rounded-xl bg-card object-cover ${photo.hidden ? 'opacity-40' : ''}`}
              />
              {photo.hidden && (
                <span className="absolute top-2 left-2">
                  <Tag>Hidden</Tag>
                </span>
              )}
              <span className="truncate text-[13px] font-semibold text-text">{photo.by}</span>
              {photo.caption && <span className="line-clamp-2 text-[13px] leading-snug text-body">{photo.caption}</span>}
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <PhotoView key={open.id} photo={open} tags={tags} isAdmin={isAdmin} onClose={() => setOpenId(null)} />
      )}
    </>
  );
}

function PhotoView(props: { photo: GalleryPhoto; tags: string[]; isAdmin: boolean; onClose: () => void }) {
  const { photo, tags, isAdmin, onClose } = props;
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = (work: () => Promise<{ error?: string } | void>) =>
    start(async () => {
      setError(null);
      const result = await work();
      if (result?.error) setError(result.error);
    });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo by ${photo.by}`}
      className="fixed inset-0 z-10 flex flex-col bg-bg pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex min-h-0 flex-1 items-center justify-center">
        {/* Long-press saves it on a phone. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.fullUrl} alt={photo.caption ?? `Photo by ${photo.by}`} className="max-h-full max-w-full object-contain" />
      </div>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-3 px-6 py-4">
        <div className="flex items-end justify-between gap-4">
          <p className="flex min-w-0 flex-col gap-1">
            <span className="flex items-center gap-2 text-[15px] font-semibold text-text">
              {photo.by}
              {photo.tag && <span className="text-[13px] font-medium text-muted">· {photo.tag}</span>}
              {photo.hidden && <Tag>Hidden</Tag>}
            </span>
            {photo.caption && <span className="text-[15px] leading-normal text-body">{photo.caption}</span>}
          </p>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-body">
              Tag
              <select
                value={photo.tag ?? ''}
                disabled={pending}
                onChange={(e) => run(() => setTag(photo.id, e.target.value || null))}
                className="h-11 rounded-full border border-line bg-bg px-4 text-[16px] text-text"
              >
                <option value="">No tag</option>
                {tags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="secondary" disabled={pending} onClick={() => run(() => setHidden(photo.id, !photo.hidden))}>
              {photo.hidden ? 'Unhide' : 'Hide'}
            </Button>
          </div>
        )}

        {(photo.mine || isAdmin) &&
          (confirming ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-body">Delete for everyone?</span>
              <Button disabled={pending} onClick={() => run(() => deletePhoto(photo.id))}>
                Yes, delete
              </Button>
              <Button variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>
                Keep
              </Button>
            </div>
          ) : (
            <div>
              <Button variant="secondary" disabled={pending} onClick={() => setConfirming(true)}>
                Delete
              </Button>
            </div>
          ))}

        {error && (
          <p role="alert" className="text-sm font-semibold text-highlight">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
