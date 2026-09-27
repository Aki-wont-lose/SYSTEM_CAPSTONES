// Client-side image compression.
// Photos are stored as base64 straight into the database, so they are resized and
// re-encoded before upload. This keeps announcements small enough to load quickly
// and to fit the dashboard layout without distorting.

const DEFAULT_MAX_WIDTH = 1600;
const DEFAULT_QUALITY = 0.82;

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the image'));
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode the image'));
    img.src = src;
  });

export const compressImage = async (file, { maxWidth = DEFAULT_MAX_WIDTH, quality = DEFAULT_QUALITY } = {}) => {
  const original = await readAsDataUrl(file);
  if (!file.type?.startsWith('image/')) return original;

  try {
    const img = await loadImage(original);
    const scale = Math.min(1, maxWidth / img.width);
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    // Flatten onto white so transparent PNGs do not turn black once encoded as JPEG
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const compressed = canvas.toDataURL('image/jpeg', quality);
    // Never hand back something larger than what we started with
    return compressed.length < original.length ? compressed : original;
  } catch {
    return original;
  }
};
