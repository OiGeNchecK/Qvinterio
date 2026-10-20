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
