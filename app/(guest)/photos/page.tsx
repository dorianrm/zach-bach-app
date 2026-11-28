import { Suspense } from 'react';
import { DayHeading } from '@/components/DayHeading';
import { PageShell } from '@/components/PageShell';
import { requireGuest } from '@/lib/auth';
import { db } from '@/lib/db';
import { BUCKET, uploadsOpenNow } from '@/lib/photos';
import { Gallery, type GalleryPhoto } from './Gallery';
import { UploadForm } from './UploadForm';

// Signed view URLs last 1 hour. A page left open longer needs a pull to refresh.
const VIEW_SECONDS = 60 * 60;

export default function PhotosPage() {
  return (
    <PageShell active="photos">
      <Suspense fallback={<p className="text-[15px] text-muted">Loading…</p>}>
        <PhotosContent />
      </Suspense>
    </PageShell>
  );
}

async function PhotosContent() {
  await requireGuest('/photos');
  const photos = await listPhotos();
  const open = uploadsOpenNow();

  return (
    <>
      <section className="flex flex-col gap-3">
        <DayHeading>Photos</DayHeading>
        {open ? (
          <UploadForm />
        ) : (
          <p className="rounded-xl bg-card p-[18px] text-[15px] text-body">
            Uploads open Fri Dec 18 at 6:00 PM and close Sun Dec 20 at noon.
          </p>
        )}
      </section>
      <section className="flex flex-col gap-3">
        {photos.length === 0 ? (
          <p className="text-[15px] text-muted">No photos yet.</p>
        ) : (
          <Gallery photos={photos} />
        )}
      </section>
    </>
  );
}

// Newest first, with signed URLs for both sizes in one Storage call.
// The full-size file is only downloaded when a guest taps the photo.
async function listPhotos(): Promise<GalleryPhoto[]> {
  const { data, error } = await db()
    .from('photos')
    .select('id, path, thumb_path, caption, guests(name)')
    .order('created_at', { ascending: false });
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
    };
  });
}
