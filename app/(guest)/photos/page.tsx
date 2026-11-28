import { Suspense } from 'react';
import { DayHeading } from '@/components/DayHeading';
import { PageShell } from '@/components/PageShell';
import { cards } from '@/content/itinerary';
import { requireGuest, type Guest } from '@/lib/auth';
import { db } from '@/lib/db';
import { BUCKET, photoTags } from '@/lib/photos';
import { uploadStatus } from '@/lib/uploads';
import { Gallery, type GalleryPhoto } from './Gallery';
import { UploadForm } from './UploadForm';

// Signed view URLs last 1 hour. A page left open longer needs a pull to refresh.
const VIEW_SECONDS = 60 * 60;

export default function PhotosPage(props: PageProps<'/photos'>) {
  return (
    <PageShell active="photos">
      <Suspense fallback={<p className="text-[15px] text-muted">Loading…</p>}>
        <PhotosContent searchParams={props.searchParams} />
      </Suspense>
    </PageShell>
  );
}

async function PhotosContent({ searchParams }: { searchParams: PageProps<'/photos'>['searchParams'] }) {
  const me = await requireGuest('/photos');
  const tags = photoTags(cards);
  const asked = (await searchParams).tag;
  // An unknown ?tag= shows every photo.
  const tag = typeof asked === 'string' && tags.includes(asked) ? asked : null;
  const [photos, { mode, open }] = await Promise.all([listPhotos(me, tag), uploadStatus()]);

  return (
    <>
      <section className="flex flex-col gap-3">
        <DayHeading>Photos</DayHeading>
        {open ? (
          <UploadForm tags={tags} />
        ) : (
          <p className="rounded-xl bg-card p-[18px] text-[15px] text-body">
            {mode === 'closed'
              ? 'Uploads are paused right now.'
              : 'Uploads open Fri Dec 18 at 6:00 PM and stay open through Sun Dec 27.'}
          </p>
        )}
      </section>
      <section className="flex flex-col gap-4">
        <nav aria-label="Filter by tag" className="-mx-6 flex gap-2 overflow-x-auto px-6">
          {[null, ...tags].map((t) => {
            const active = t === tag;
            return (
              <a
                key={t ?? 'all'}
                href={t ? `/photos?tag=${encodeURIComponent(t)}` : '/photos'}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold no-underline ${
                  active ? 'bg-link text-on-highlight' : 'border border-line text-text'
                }`}
              >
                {t ?? 'All'}
              </a>
            );
          })}
        </nav>
        {photos.length === 0 ? (
          <p className="text-[15px] text-muted">{tag ? `No ${tag} photos yet.` : 'No photos yet.'}</p>
        ) : (
          <Gallery photos={photos} tags={tags} isAdmin={me.isAdmin} />
        )}
      </section>
    </>
  );
}

// Newest first, with signed URLs for both sizes in one Storage call.
// The full-size file is only downloaded when a guest taps the photo.
// Guests never get hidden photos. The organizer sees them, marked, to unhide.
async function listPhotos(me: Guest, tag: string | null): Promise<GalleryPhoto[]> {
  let query = db()
    .from('photos')
    .select('id, guest_id, path, thumb_path, caption, tag, hidden, guests(name)')
    .order('created_at', { ascending: false });
  if (!me.isAdmin) query = query.eq('hidden', false);
  if (tag) query = query.eq('tag', tag);
  const { data, error } = await query;
  if (error) throw error;
  if (data.length === 0) return [];

  const paths = data.flatMap((p) => [p.thumb_path, p.path]);
  const signed = await db().storage.from(BUCKET).createSignedUrls(paths, VIEW_SECONDS);
  if (signed.error) throw signed.error;
  const urls = new Map(signed.data.map((s) => [s.path, s.signedUrl]));

  return data.map((p) => {
    // One guest per photo. The generated type allows an array, so take the first.
    const guest = Array.isArray(p.guests) ? p.guests[0] : p.guests;
    return {
      id: p.id,
      thumbUrl: urls.get(p.thumb_path) ?? '',
      fullUrl: urls.get(p.path) ?? '',
      caption: p.caption,
      by: guest?.name ?? 'A guest',
      tag: p.tag,
      hidden: p.hidden,
      mine: p.guest_id === me.id,
    };
  });
}
