import { exifToIso, fitSize } from '@/lib/photos';

// Browser-only: turns a picked file into the two JPEGs the bucket stores.
// Drawing onto a canvas resizes, converts HEIC (where the browser can open it) and strips
// EXIF, so the time taken is read first.

export type Prepared = { full: Blob; thumb: Blob; takenAt: string | null };

const FULL_EDGE = 2000; // long side, ~500 KB
const THUMB_EDGE = 400; // short side, so it fills a square grid cell

export async function preparePhoto(file: File): Promise<Prepared> {
  const takenAt = await readTakenAt(file);
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    // Browsers apply the EXIF rotation to <img>, so naturalWidth/Height are already upright.
    await img.decode();
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const full = await draw(img, fitSize(w, h, FULL_EDGE, 'long'), 0.82);
    const thumb = await draw(img, fitSize(w, h, THUMB_EDGE, 'short'), 0.75);
    return { full, thumb, takenAt };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function readTakenAt(file: File): Promise<string | null> {
  try {
    const { default: exifr } = await import('exifr');
    // Raw strings: exifr would read the time in the phone's zone. exifToIso reads it as Pacific.
    const tags = await exifr.parse(file, { pick: ['DateTimeOriginal'], reviveValues: false });
    return exifToIso(tags?.DateTimeOriginal);
  } catch {
    return null; // No EXIF (screenshots, some Android shares). T9 falls back to the upload time.
  }
}

function draw(img: HTMLImageElement, size: { width: number; height: number }, quality: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas');
  ctx.drawImage(img, 0, 0, size.width, size.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not make a JPEG'))), 'image/jpeg', quality);
  });
}

// PUT straight to the bucket with a signed upload URL. XHR, because fetch has no upload progress.
export function putFile(url: string, blob: Blob, onProgress: (loaded: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('content-type', 'image/jpeg');
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('Network'));
    xhr.send(blob);
  });
}
