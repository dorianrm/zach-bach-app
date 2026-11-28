import { Suspense } from 'react';
import { PageShell } from '@/components/PageShell';
import { Tag } from '@/components/Tag';
import { requireAdmin } from '@/lib/auth';
import type { UploadMode } from '@/lib/photos';
import { uploadStatus } from '@/lib/uploads';
import { setUploadMode } from './actions';

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
  const { mode, open } = await uploadStatus();

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
    </>
  );
}
