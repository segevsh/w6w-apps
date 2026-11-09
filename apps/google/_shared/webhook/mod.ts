/**
 * Webhook verification kit — the signature primitives every signed-webhook trigger needs, once.
 *
 * GENERATED COPIES: `apps/<group>/_shared/webhook/` are byte-identical copies of this directory
 * made by `_tools/sync-shared.ts`. Edit only `apps/_shared/webhook/`, then run the tool.
 *
 * Fail closed: a missing raw body, a length mismatch or a stale timestamp must refuse the delivery.
 * Error text never echoes a secret, a signature or a header value. Vendor-specific signing schemes
 * live in each app; this kit only provides the primitives.
 *
 * Pure by design: no network calls, no runtime-specific globals, no node builtins (`crypto.subtle`
 * and `crypto.getRandomValues` are web-standard and work inside the trigger-hook sandbox).
 */

const encoder = new TextEncoder();

/**
 * The exact bytes the host received, as a string. Throws unless `rawBody` is a string — never fall
 * back to re-serialising the parsed body, which differs from what the vendor signed.
 */
export function requireRawBody(raw: { rawBody?: unknown }): string {
  if (
    raw === null || typeof raw !== "object" || typeof raw.rawBody !== "string"
  ) {
    throw new Error(
      "webhook delivery refused: the raw body is unavailable, so its signature cannot be verified",
    );
  }
  return raw.rawBody;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** HMAC of `data` (UTF-8) under `key`, encoded as lowercase hex or standard padded base64. */
export async function hmac(
  alg: "SHA-256" | "SHA-1",
  key: string | Uint8Array,
  data: string,
  enc: "hex" | "base64",
): Promise<string> {
  const keyBytes = new Uint8Array(
    typeof key === "string" ? encoder.encode(key) : key,
  );
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: alg },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data)),
  );
  return enc === "hex" ? bytesToHex(sig) : bytesToBase64(sig);
}

/**
 * Constant-time string equality over the UTF-8 bytes. Visits every byte of the longer input (a
 * missing byte counts as a mismatch) and never returns from inside the loop; a length mismatch is
 * folded into the result and reported only after the loop.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  const n = Math.max(x.length, y.length);
  let diff = x.length ^ y.length;
  for (let i = 0; i < n; i++) {
    diff |= (i < x.length ? x[i] : 0) ^ (i < y.length ? y[i] : 0);
  }
  return diff === 0;
}

/** True when the signed timestamp (epoch seconds) is within `toleranceSec` of `nowMs`, either way. */
export function withinTolerance(
  tsSeconds: number,
  nowMs: number,
  toleranceSec = 300,
): boolean {
  if (!Number.isFinite(tsSeconds) || !Number.isFinite(nowMs)) return false;
  return Math.abs(nowMs / 1000 - tsSeconds) <= toleranceSec;
}

/** Random secret as lowercase hex (2 characters per byte) from `crypto.getRandomValues`. */
export function randomSecret(bytes = 32): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** Case-insensitive header lookup (the host lowercases names; this tolerates either). */
export function header(
  raw: { headers: Record<string, string> },
  name: string,
): string | undefined {
  const want = name.toLowerCase();
  const headers = raw.headers ?? {};
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() === want) return headers[k];
  }
  return undefined;
}
