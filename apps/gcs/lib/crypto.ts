/**
 * RS256 signing from a service-account key, in the sandbox.
 *
 * The V4 signature on a signed URL is `RSASSA-PKCS1-v1_5` over SHA-256, which
 * is what `crypto.subtle` offers and what Google calls RS256. The app itself
 * no longer signs with a service-account key (the host mints tokens and IAM
 * `signBlob` signs URLs); these helpers remain for `lib/signing.ts` hashing and
 * as the local reference signer its tests verify against.
 *
 * The app sandbox has no imports, so the encoders are inlined rather than
 * pulled from `@std/encoding`. Their output is identical.
 */

/** Lowercase hex, which is what a V4 signature is transmitted as. */
export function encodeHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

/** SHA-256, as lowercase hex. V4 canonicalisation is full of these. */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return encodeHex(new Uint8Array(digest));
}

/**
 * Import the PEM `private_key` from a Google JSON key.
 *
 * Google's JSON encodes the newlines as `\n` **inside a JSON string**, so a
 * value pasted through a form often arrives with literal backslash-n rather
 * than real newlines. Stripping all whitespace after removing the PEM markers
 * handles both, and the literal `\n` case is normalised first — without it,
 * the base64 contains backslashes and `atob` throws something unhelpful about
 * the character set.
 */
export async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const normalized = String(pem ?? "").replace(/\\n/g, "\n");
  const cleaned = normalized
    .replace(/-----BEGIN [A-Z ]+-----/g, "")
    .replace(/-----END [A-Z ]+-----/g, "")
    .replace(/\s+/g, "");
  if (!cleaned) {
    throw new Error(
      "the private key is empty after stripping its PEM markers — paste the whole `private_key` " +
        "value from the service account's JSON key, including the BEGIN and END lines",
    );
  }
  let der: Uint8Array;
  try {
    der = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
  } catch {
    throw new Error(
      "the private key is not valid base64 once its PEM markers are stripped. If it was pasted " +
        "from the JSON key, check the `\\n` sequences survived as newlines or as literal " +
        "backslash-n, and that nothing else was included",
    );
  }
  try {
    return await crypto.subtle.importKey(
      "pkcs8",
      der as unknown as BufferSource,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );
  } catch {
    throw new Error(
      "the private key could not be imported as a PKCS#8 RSA key — a Google service-account key " +
        "is PKCS#8 (`-----BEGIN PRIVATE KEY-----`), not PKCS#1 (`BEGIN RSA PRIVATE KEY`)",
    );
  }
}

/** Sign with RS256 and return the raw signature bytes. */
export async function signRs256(key: CryptoKey, input: string): Promise<Uint8Array> {
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    new TextEncoder().encode(input),
  );
  return new Uint8Array(signature);
}
