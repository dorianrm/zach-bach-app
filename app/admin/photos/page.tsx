import { Suspense } from 'react';
import { PageShell } from '@/components/PageShell';
import { Tag } from '@/components/Tag';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import type { UploadMode } from '@/lib/photos';
import { uploadStatus } from '@/lib/uploads';
import { deleteAllPhotos, setUploadMode } from './actions';

const choices: { mode: UploadMode; label: string; detail: string }[] = [
  { mode: 'auto', label: 'Auto', detail: 'Open Fri Dec 18 at 6:00 PM, closed after Sun Dec 27.' },
  { mode: 'open', label: 'Open now', detail: 'For testing before the weekend. Set back to Auto after.' },
  { mode: 'closed', label: 'Closed', detail: 'Stops new uploads. Guests still see the gallery.' },
];

export default function AdminPhotosPage() {
  return (
    <PageShell active="more">
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-highlight">Photos admin</h2>
          <a href="/admin" className="text-sm text-link">
            Admin
          </a>
        </div>
        <Suspense fallback={<p className="text-[15px] text-muted">Loading…</p>}>
          <PhotosAdmin />
        </Suspense>
      </section>
    </PageShell>
  );
}

async function PhotosAdmin() {
  await requireAdmin('/admin/photos');
  const [{ mode, open }, total, hidden] = await Promise.all([uploadStatus(), countPhotos(false), countPhotos(true)]);

  return (
    <>
      <p className="text-[15px] text-body">{open ? 'Uploads are open right now.' : 'Uploads are closed right now.'}</p>
      <ul className="flex flex-col gap-3">
        {choices.map((c) => {
          const current = c.mode === mode;
          return (
            <li key={c.mode}>
              <form action={setUploadMode}>
                <input type="hidden" name="mode" value={c.mode} />
                <button
                  type="submit"
                  aria-pressed={current}
                  aria-label={c.label}
                  aria-describedby={`mode-${c.mode}`}
                  className={`flex min-h-14 w-full flex-col gap-1 rounded-xl bg-card px-[18px] py-3 text-left ${
                    current ? 'border-2 border-highlight' : ''
                  }`}
                >
                  <span className="flex items-center gap-2.5 text-base font-semibold text-link">
                    {c.label}
                    {current && <Tag>Current</Tag>}
                  </span>
                  <span id={`mode-${c.mode}`} className="text-[14px] text-body">
                    {c.detail}
                  </span>
                </button>
              </form>
            </li>
          );
        })}
      </ul>

      <p className="pt-2 text-[15px] text-body">
        {total === 1 ? '1 photo' : `${total} photos`} in the gallery{hidden > 0 ? `, ${hidden} hidden` : ''}. Hide, retag
        or delete one from its full view on the Photos tab.
      </p>
      {/* Two taps, so a stray tap cannot wipe the gallery. For clearing test photos before Dec 18. */}
      {total > 0 && (
        <details className="rounded-xl bg-card p-[18px]">
          <summary className="cursor-pointer text-base font-semibold text-link">Delete all photos</summary>
          <div className="flex flex-col gap-3 pt-3">
            <p className="text-[15px] text-body">
              For clearing test photos before the weekend. Removes every photo and file for everyone. It cannot be undone.
            </p>
            <form action={deleteAllPhotos}>
              <button
                type="submit"
                className="min-h-11 w-full rounded-full bg-highlight px-[18px] text-sm font-semibold text-on-highlight"
              >
                Yes, delete all {total}
              </button>
            </form>
          </div>
        </details>
      )}
    </>
  );
}

async function countPhotos(hiddenOnly: boolean): Promise<number> {
  let query = db().from('photos').select('id', { count: 'exact', head: true });
  if (hiddenOnly) query = query.eq('hidden', true);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}
