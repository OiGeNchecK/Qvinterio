export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// next/image and window.location do not add basePath on their own.
export function asset(path: string) {
  return `${basePath}${path}`;
}
