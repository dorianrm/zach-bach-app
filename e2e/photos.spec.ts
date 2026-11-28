import { expect, test, type Page } from '@playwright/test';
import { fileSize, photosOf, resetPhotos, resetPins, setUploadMode } from './db';
import { ADMIN_PIN, testDb } from './env';
import { enter, join, joinAsOrganizer, secondPhone, submitAction } from './helpers';

test.beforeEach(async ({ page }) => {
  await resetPins();
  await resetPhotos();
  // Open, so the upload tests can run any day. The switch test below sets its own.
  await setUploadMode('open');
  await enter(page);
});

// A phone-camera-sized JPEG drawn in the browser, with an EXIF DateTimeOriginal added, so
// the upload has to resize it and read the time taken.
async function cameraPhoto(page: Page, name: string, color: string, taken: string) {
  const dataUrl = await page.evaluate((fill) => {
    const canvas = document.createElement('canvas');
    canvas.width = 3000;
    canvas.height = 2250;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, 3000, 2250);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(600, 500, 1800, 1250);
    return canvas.toDataURL('image/jpeg', 0.9);
  }, color);
  const jpeg = Buffer.from(dataUrl.split(',')[1], 'base64');
  return { name, mimeType: 'image/jpeg', buffer: withExifDate(jpeg, taken) };
}

// The picker turns on once the page is hydrated. A file set before that would be dropped.
async function pick(page: Page, files: Awaited<ReturnType<typeof cameraPhoto>>[]) {
  const picker = page.getByLabel('Add photos');
  await expect(picker).toBeEnabled();
  await picker.setInputFiles(files);
}

// Inserts a minimal EXIF block (IFD0 -> Exif IFD -> DateTimeOriginal) right after the JPEG's SOI.
function withExifDate(jpeg: Buffer, taken: string): Buffer {
  const tiff = Buffer.alloc(64);
  tiff.write('II', 0, 'ascii');
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4); // IFD0 at 8
  tiff.writeUInt16LE(1, 8);
  tiff.writeUInt16LE(0x8769, 10); // ExifIFDPointer, LONG, 1, at 26
  tiff.writeUInt16LE(4, 12);
  tiff.writeUInt32LE(1, 14);
  tiff.writeUInt32LE(26, 18);
  tiff.writeUInt32LE(0, 22);
  tiff.writeUInt16LE(1, 26);
  tiff.writeUInt16LE(0x9003, 28); // DateTimeOriginal, ASCII, 20 bytes, at 44
  tiff.writeUInt16LE(2, 30);
  tiff.writeUInt32LE(20, 32);
  tiff.writeUInt32LE(44, 36);
  tiff.writeUInt32LE(0, 40);
  tiff.write(`${taken}\0`, 44, 'ascii');
  const header = Buffer.from([0xff, 0xe1, 0, 0]);
  header.writeUInt16BE(2 + 6 + tiff.length, 2);
  return Buffer.concat([jpeg.subarray(0, 2), header, Buffer.from('Exif\0\0', 'ascii'), tiff, jpeg.subarray(2)]);
}

test('the photos tab asks a visitor to join first', async ({ page }) => {
  await page.goto('/photos');
  await expect(page).toHaveURL('/join?next=%2Fphotos');
});

test('a guest uploads two photos, and another guest sees them with name and caption', async ({ page, browser }, testInfo) => {
  await join(page, 'Alex Weirth', '1234', { setup: true });
  await page.getByRole('link', { name: 'Photos' }).click();
  await expect(page).toHaveURL('/photos');
  await expect(page.getByText('No photos yet.')).toBeVisible();

  await pick(page, [
    await cameraPhoto(page, 'IMG_0001.JPG', '#2d4f9e', '2026:12:18 19:05:31'),
    await cameraPhoto(page, 'IMG_0002.JPG', '#ff6b5e', '2026:12:18 21:40:00'),
  ]);
  await page.getByLabel('Caption for photo 1').fill('  Zach at   dinner ');
  await page.screenshot({ path: `test-results/screens/${testInfo.project.name}-photos-picked.png` });
  await page.getByRole('button', { name: 'Upload 2 photos' }).click();
  await expect(page.getByText('2 photos added.')).toBeVisible({ timeout: 15_000 });

  // Saved with the EXIF time read as Pacific, and the caption cleaned to one line.
  const rows = await photosOf('Alex Weirth');
  expect(rows.map((r) => r.taken_at).sort()).toEqual(['2026-12-19T03:05:00+00:00', '2026-12-19T05:40:00+00:00']);
  expect(rows.map((r) => r.caption).sort()).toEqual(['Zach at dinner', null].sort());
  // Resized on the phone: the 3000 px photo is under 1 MB, and the thumbnail is much smaller.
  const full = await fileSize(rows[0].path);
  const thumb = await fileSize(rows[0].thumb_path);
  expect(full).toBeLessThan(1_000_000);
  expect(thumb).toBeLessThan(full / 4);

  const guest = await secondPhone(browser, testInfo);
  await join(guest, 'Benjamin Burton', '5678', { setup: true });
  await guest.goto('/photos');
  const photo = guest.getByRole('button', { name: 'Photo by Alex Weirth: Zach at dinner' });
  await expect(photo).toBeVisible();
  await expect(guest.getByRole('button', { name: /^Photo by Alex Weirth/ })).toHaveCount(2);
  // The signed thumbnail URL loads, at thumbnail size (400 px on the short side).
  await expect.poll(() => photo.locator('img').evaluate((img: HTMLImageElement) => img.naturalHeight)).toBe(400);
  await guest.screenshot({ path: `test-results/screens/${testInfo.project.name}-photos.png` });

  // Tap for full size.
  await photo.click();
  const dialog = guest.getByRole('dialog', { name: 'Photo by Alex Weirth' });
  await expect(dialog.getByRole('img', { name: 'Zach at dinner' })).toBeVisible();
  await expect.poll(() => dialog.getByRole('img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(2000);
  await guest.screenshot({ path: `test-results/screens/${testInfo.project.name}-photo-full.png` });
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
  await guest.context().close();
});

test('the bucket is private: a file cannot be read without a signed URL', async ({ page }) => {
  await join(page, 'Alex Weirth', '1234', { setup: true });
  await page.goto('/photos');
  await pick(page, [await cameraPhoto(page, 'a.jpg', '#2d4f9e', '2026:12:18 19:05:31')]);
  await page.getByRole('button', { name: 'Upload photo' }).click();
  await expect(page.getByText('Photo added.')).toBeVisible({ timeout: 15_000 });

  const [row] = await photosOf('Alex Weirth');
  const res = await page.request.get(`${testDb().url}/storage/v1/object/public/photos/${row.path}`);
  expect(res.ok()).toBe(false);
});

test('a guest cannot reach photos admin', async ({ page }) => {
  await join(page, 'Alex Weirth', '1234', { setup: true });
  await page.goto('/admin/photos');
  await expect(page).toHaveURL('/admin?next=%2Fadmin%2Fphotos');
});

test('Dorian closes, opens and sets uploads back to Auto from the phone', async ({ page, browser }, testInfo) => {
  const guest = await secondPhone(browser, testInfo);
  await join(guest, 'Alex Weirth', '1234', { setup: true });

  await joinAsOrganizer(page, ADMIN_PIN);
  await page.goto('/more');
  await page.getByRole('link', { name: 'Photos admin' }).click();
  await expect(page.getByText('Uploads are open right now.')).toBeVisible();

  await submitAction(page, 'Closed');
  await expect(page.getByRole('button', { name: 'Closed', pressed: true })).toBeVisible();
  await expect(page.getByText('Uploads are closed right now.')).toBeVisible();
  await page.screenshot({ path: `test-results/screens/${testInfo.project.name}-photos-admin.png` });
  await guest.goto('/photos');
  await expect(guest.getByText('Uploads are paused right now.')).toBeVisible();
  await expect(guest.getByLabel('Add photos')).toHaveCount(0);

  // Auto follows the Dec 18-20 window. The suite runs before it, so uploads stay closed.
  await submitAction(page, 'Auto');
  await expect(page.getByRole('button', { name: 'Auto', pressed: true })).toBeVisible();
  await guest.reload();
  await expect(guest.getByText('Uploads open Fri Dec 18 at 6:00 PM and close Sun Dec 20 at noon.')).toBeVisible();

  await submitAction(page, 'Open now');
  await guest.reload();
  await expect(guest.getByLabel('Add photos')).toBeVisible();
  await guest.context().close();
});
