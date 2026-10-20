import { createClient } from "@/lib/supabase/client";

const BUCKET = "portfolio";

// Uploads an image to the public "portfolio" bucket and returns its URL.
export async function uploadImage(file: File, folder: string): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const storage = createClient().storage.from(BUCKET);
  const { error } = await storage.upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) throw new Error(error.message);
  return storage.getPublicUrl(path).data.publicUrl;
}

// Deletes a file we uploaded; older external images and site files are left alone.
export async function removeUploaded(url: string | null | undefined) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = url?.indexOf(marker) ?? -1;
  if (!url || i < 0) return;
  await createClient().storage.from(BUCKET).remove([decodeURIComponent(url.slice(i + marker.length))]);
}

// Phone photos are large; scale them down before upload. Falls back to the
// original file if the browser cannot decode it.
export async function shrink(file: File, max = 2000): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}
