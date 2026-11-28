'use client';

import { useRef, useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/Button';
import { CAPTION_MAX, MAX_PER_UPLOAD } from '@/lib/photos';
import { createUploadUrls, savePhoto } from './actions';
import { preparePhoto, putFile, type Prepared } from './prepare';

type Item = {
  key: string;
  name: string;
  caption: string;
  preview?: string;
  prepared?: Prepared;
  failed?: boolean;
};

const noSubscribe = () => () => {};

type Progress = { index: number; count: number; loaded: number; total: number };

// Pick photos, add captions, upload. Each photo is resized on the phone first, then sent
// straight to the bucket with signed URLs, one photo at a time.
export function UploadForm() {
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = items.filter((i) => i.prepared);
  const busy = preparing || progress !== null;
  // The server-rendered picker is visible before the script loads on slow data. A photo
  // picked then would be dropped, so the picker stays off until the form is live.
  // False in the server HTML, true once hydrated.
  const live = useSyncExternalStore(noSubscribe, () => true, () => false);
  const pickerOff = busy || !live;

  const update = (key: string, patch: Partial<Item>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const remove = (keys: string[]) =>
    setItems((list) => {
      list.filter((i) => keys.includes(i.key)).forEach((i) => i.preview && URL.revokeObjectURL(i.preview));
      return list.filter((i) => !keys.includes(i.key));
    });

  async function pick(files: FileList | null) {
    setMessage(null);
    setError(null);
    const picked = Array.from(files ?? []);
    if (input.current) input.current.value = '';
    if (picked.length === 0) return;

    const room = MAX_PER_UPLOAD - items.length;
    if (picked.length > room) setError(`Up to ${MAX_PER_UPLOAD} photos at a time. Upload these, then pick more.`);
    const added = picked.slice(0, Math.max(room, 0)).map((file) => ({
      file,
      item: { key: crypto.randomUUID(), name: file.name, caption: '' } as Item,
    }));
    setItems((list) => [...list, ...added.map((a) => a.item)]);

    // One at a time: a phone can run out of memory decoding several large photos at once.
    setPreparing(true);
    for (const { file, item } of added) {
      try {
        const prepared = await preparePhoto(file);
        update(item.key, { prepared, preview: URL.createObjectURL(prepared.thumb) });
      } catch {
        update(item.key, { failed: true });
      }
    }
    setPreparing(false);
  }

  async function upload() {
    setMessage(null);
    setError(null);
    const batch = ready;
    const result = await createUploadUrls(batch.length);
    if ('error' in result) {
      setError(result.error);
      return;
    }

    const total = batch.reduce((sum, i) => sum + i.prepared!.full.size + i.prepared!.thumb.size, 0);
    let sent = 0;
    try {
      for (const [index, item] of batch.entries()) {
        const { full, thumb, takenAt } = item.prepared!;
        const ticket = result.tickets[index];
        const show = (loaded: number) => setProgress({ index, count: batch.length, loaded: sent + loaded, total });
        show(0);
        await putFile(ticket.url, full, show);
        sent += full.size;
        await putFile(ticket.thumbUrl, thumb, show);
        sent += thumb.size;
        const saved = await savePhoto({ path: ticket.path, thumbPath: ticket.thumbPath, caption: item.caption, takenAt });
        if (saved.error) throw new Error(saved.error);
        remove([item.key]);
      }
      setMessage(batch.length === 1 ? 'Photo added.' : `${batch.length} photos added.`);
    } catch {
      // Photos already saved are gone from the list. The rest stay, so a tap tries again.
      setError('Upload stopped. Check your signal and tap Upload again.');
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-card p-[18px]">
      <p className="text-[15px] text-body">Anything from this weekend.</p>

      {items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {items.map((item, n) => (
            <li key={item.key} className="flex items-center gap-3">
              {item.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.preview} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="size-14 shrink-0 rounded-lg bg-line" />
              )}
              {item.failed ? (
                <span className="text-[14px] text-muted">This photo could not be opened on this phone.</span>
              ) : (
                <input
                  type="text"
                  value={item.caption}
                  maxLength={CAPTION_MAX}
                  disabled={busy || !item.prepared}
                  onChange={(e) => update(item.key, { caption: e.target.value })}
                  aria-label={`Caption for photo ${n + 1}`}
                  placeholder={item.prepared ? 'Caption (optional)' : 'Getting it ready…'}
                  className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-[16px] text-text placeholder:text-muted"
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {progress && (
        <div role="status" className="flex flex-col gap-2">
          <span className="text-[14px] text-body">
            Uploading {progress.index + 1} of {progress.count}
          </span>
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-highlight" style={{ width: `${Math.round((progress.loaded / progress.total) * 100)}%` }} />
          </div>
        </div>
      )}
      {message && (
        <p role="status" className="text-[15px] font-semibold text-text">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-highlight">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <label
          className={`inline-flex min-h-11 items-center justify-center rounded-full px-6 text-[15px] font-semibold ${
            ready.length > 0 ? 'border border-line text-text' : 'bg-highlight text-on-highlight'
          } ${pickerOff ? 'pointer-events-none opacity-60' : ''}`}
        >
          {items.length > 0 ? 'Add more' : 'Add photos'}
          <input
            ref={input}
            type="file"
            accept="image/*"
            multiple
            disabled={pickerOff}
            onChange={(e) => void pick(e.target.files)}
            className="sr-only"
          />
        </label>
        {ready.length > 0 && (
          <Button disabled={busy} onClick={() => void upload()}>
            Upload {ready.length === 1 ? 'photo' : `${ready.length} photos`}
          </Button>
        )}
        {items.length > 0 && !busy && (
          <Button variant="secondary" onClick={() => remove(items.map((i) => i.key))}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
