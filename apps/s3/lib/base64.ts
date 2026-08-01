/**
 * Base64 <-> bytes, using the sandbox's built-in `atob`/`btoa` (no
 * dependency). See `README.md` § Binary content for the asymmetry between
 * these two directions: `bytesToBase64` is exact (used on a downloaded
 * `ArrayBuffer`, which survives the sandbox boundary as real bytes);
 * `base64ToBytes`'s result is only safe end-to-end for a PUT body when every
 * decoded byte is < 0x80, because the action-to-sign-to-network pipe coerces
 * the request body through a JS string (`String(init.body)` in
 * `@w6w/runtime`'s worker fetch shim), which re-encodes any string as UTF-8 —
 * silently corrupting byte values 0x80-0xFF that came from `atob`'s Latin-1
 * output. That coercion lives in the shared runtime, outside this app.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** Latin-1 "binary string" (one JS char per byte, code points 0-255) — NOT UTF-8 text. */
export function base64ToBinaryString(b64: string): string {
  return atob(b64);
}
