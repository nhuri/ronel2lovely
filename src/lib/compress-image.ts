import imageCompression from "browser-image-compression";

const compressionOptions = {
  maxSizeMB: 0.3,
  maxWidthOrHeight: 800,
  useWebWorker: true,
};

export class UnreadableImageError extends Error {}

function looksLikeHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return type === "image/heic" || type === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif");
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const { default: heic2any } = await import("heic2any");
  const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(result) ? result[0] : result;
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
}

// Some mobile browsers (notably iPhone camera captures) hand us HEIC files
// that <canvas>-based compression can't decode, and in-app webviews
// (WhatsApp/Instagram/Facebook) sometimes hand us files with missing/wrong
// name and type metadata. Never let those silently drop the photo: convert
// HEIC up front, and if compression still fails, fall back to the
// pre-compression bytes rather than throwing the file away.
export async function compressImage(file: File): Promise<File> {
  let source = file;

  if (looksLikeHeic(file)) {
    try {
      source = await convertHeicToJpeg(file);
    } catch {
      // Couldn't decode HEIC either; try compressing the original bytes as-is.
    }
  }

  try {
    return await imageCompression(source, compressionOptions);
  } catch {
    if (source.size > 0) return source;
    throw new UnreadableImageError("לא הצלחנו לקרוא את קובץ התמונה. נסה תמונה אחרת או בפורמט JPG.");
  }
}
