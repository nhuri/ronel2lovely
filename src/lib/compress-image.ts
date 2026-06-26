import imageCompression from "browser-image-compression";

const compressionOptions = {
  maxSizeMB: 0.3,
  maxWidthOrHeight: 800,
  useWebWorker: true,
};

export async function compressImage(file: File): Promise<File> {
  return imageCompression(file, compressionOptions);
}
