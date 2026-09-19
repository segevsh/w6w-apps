/**
 * SCRAM-SHA-256 (RFC 5802 generic SCRAM + RFC 7677's SHA-256 binding), the
 * only mechanism this app speaks. PostgreSQL has offered it as the default
 * since 10 (2017); `md5`/cleartext are refused outright by `auth/postgres.ts`
 * rather than silently attempted.
 *
 * ## Why this file exists instead of one message-by-message inline in the hook
 *
 * SCRAM is challenge-response, so — unlike `azure-blob/auth/shared-key.ts`'s
 * `sign`, which computes a whole HMAC from the request already in front of it —
 * the client's second and third messages are functions of a value **the
 * server chooses at handshake time** (its nonce, salt, iteration count). That
 * is the entire reason the ABI gives Auth a `handshake` hook instead of
 * widening `sign`. This module keeps that arithmetic — string construction,
 * PBKDF2, the HMAC chain, the constant-time signature check — independent of
 * the wire framing (`lib/wire.ts`) and independent of the iterative hook glue
 * (`auth/postgres.ts`), so each is independently testable and the arithmetic
 * can be checked against RFC 7677 §3's own published vector without any
 * socket or frame in the way.
 *
 * ## The step this format makes easy to omit — and why it is not omitted here
 *
 * SCRAM is *mutual* authentication: the server also proves it knows the
 * stored key by returning `v=<ServerSignature>` in its final message. A
 * client that stops at "my ClientProof was accepted" has authenticated
 * itself to the server and learned nothing about who answered — it would
 * accept a MITM that merely relayed the client's own messages back before
 * forging an `AuthenticationOk`. `verifyServerFinalMessage` below is the
 * check that closes that gap, and it compares in **constant time**
 * (`timingSafeEqual`) so the comparison itself cannot leak which prefix of
 * the signature was wrong.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

/**
 * A hand-rolled floor, not an RFC requirement (SCRAM specifies no minimum).
 * NIST SP 800-63B / OWASP's current PBKDF2 guidance treats anything under
 * 4,096 rounds as too cheap to resist offline guessing once a database
 * leaks — refusing below it turns a malicious or compromised server's
 * "let's make this trivial to crack" downgrade into a loud failure instead
 * of a silent one.
 */
export const MIN_SCRAM_ITERATIONS = 4096;

/** GS2 header: no channel binding, no SASL authzid. Constant for this app. */
const GS2_HEADER = "n,,";
/** `base64("n,,")` — the channel-binding value every client-final message carries. */
const CHANNEL_BINDING = "biws";

/**
 * Escape `,` and `=` in a SASL `n=` username attribute (RFC 5802 §5.1): a
 * literal comma would be read as the next attribute's delimiter, so both
 * characters are replaced in a single pass — encoding `=` FIRST would also
 * re-encode the `=` inside the `,`'s own replacement (`=2C` contains no `=`,
 * but doing this as two sequential `.replace()` calls in either order is a
 * classic way to get it wrong the moment someone reorders them), so this
 * does it as one pass over the string instead of two dependent ones.
 */
export function escapeSaslName(name: string): string {
  let out = "";
  for (const ch of name) {
    if (ch === ",") out += "=2C";
    else if (ch === "=") out += "=3D";
    else out += ch;
  }
  return out;
}

/**
 * SASLprep (RFC 4013), applied to the password before it enters `Hi()`, per
 * RFC 7677 §4. **Not implemented here beyond an ASCII pass-through**: a
 * correct SASLprep needs the Unicode `stringprep` bidi/mapping/prohibited-
 * character tables, which is a meaningful chunk of machinery this app does
 * not otherwise need. An ASCII password (the overwhelming common case for a
 * database credential) is unaffected by SASLprep — it has no case folding,
 * no width mapping, nothing to normalize — so passing it through unchanged
 * is correct for that case. A **non-ASCII** password is a **known gap**: it
 * is sent as-is rather than normalized, which can fail to authenticate
 * against a server whose credential was stored via a client that DID
 * normalize it. Flagged here rather than left silent, per this node's
 * contract.
 */
export function saslprep(password: string): string {
  return password;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** 24 random bytes, base64-encoded — the nonce's own alphabet does not matter, only its entropy. */
function randomNonce(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return toBase64(bytes);
}

async function hmacSha256(key: Uint8Array, data: Uint8Array | string): Promise<Uint8Array> {
  const msg = typeof data === "string" ? encoder.encode(data) : data;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, msg as BufferSource);
  return new Uint8Array(sig);
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", data as BufferSource));
}

/** `Hi(password, salt, iterations)` (RFC 5802 §2.2) — PBKDF2-HMAC-SHA-256. */
async function hi(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password) as BufferSource,
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

function xor(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i];
  return out;
}

/**
 * Compare two byte strings without branching on where they first differ.
 * Deliberately does NOT short-circuit on a length mismatch before the byte
 * loop — it runs the same fixed-size comparison for a wrong-length input as
 * for a right-length one, so timing carries no information about *why* the
 * check failed either.
 */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

/** State threaded through `HandshakeStep.state` between the client-first and client-final steps. */
export interface ScramClientState {
  clientNonce: string;
  clientFirstMessageBare: string;
  password: string;
}

/** Build the client-first message (SASLInitialResponse payload). Pure — no I/O. */
export function clientFirstMessage(
  username: string,
  password: string,
  clientNonce: string = randomNonce(),
): { message: string; state: ScramClientState } {
  const bare = `n=${escapeSaslName(username)},r=${clientNonce}`;
  return {
    message: GS2_HEADER + bare,
    state: { clientNonce, clientFirstMessageBare: bare, password: saslprep(password) },
  };
}

/** Parse `s=<salt>,i=<count>,r=<nonce>` (order-agnostic per RFC 5802's attribute-value grammar). */
function parseServerFirstMessage(
  serverFirstMessage: string,
): { nonce: string; salt: Uint8Array; iterations: number } {
  const attrs = new Map<string, string>();
  for (const part of serverFirstMessage.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    attrs.set(part.slice(0, eq), part.slice(eq + 1));
  }
  const nonce = attrs.get("r");
  const saltB64 = attrs.get("s");
  const iterStr = attrs.get("i");
  if (!nonce || !saltB64 || !iterStr) {
    throw new Error(
      `postgres: malformed SCRAM server-first-message (missing r=/s=/i=): ${serverFirstMessage}`,
    );
  }
  const iterations = Number(iterStr);
  if (!Number.isInteger(iterations) || iterations < MIN_SCRAM_ITERATIONS) {
    throw new Error(
      `postgres: SCRAM iteration count ${iterStr} is below the accepted floor of ` +
        `${MIN_SCRAM_ITERATIONS} — refusing a cost this cheap to brute-force`,
    );
  }
  return { nonce, salt: fromBase64(saltB64), iterations };
}

export interface ScramFinal {
  clientFinalMessage: string;
  /** Compare the server's `v=` against this — with `timingSafeEqual`, never `===`. */
  expectedServerSignature: Uint8Array;
}

/**
 * Build the client-final message from the server's first message. Throws if
 * the server nonce does not start with the client nonce (RFC 5802 §5.1 — the
 * one check that catches a server, or an attacker between here and it, that
 * dropped or substituted the client's own contribution to the nonce) or if
 * the iteration count is below {@link MIN_SCRAM_ITERATIONS}.
 */
export async function computeClientFinal(
  serverFirstMessage: string,
  state: ScramClientState,
): Promise<ScramFinal> {
  const { nonce: fullNonce, salt, iterations } = parseServerFirstMessage(serverFirstMessage);
  if (!fullNonce.startsWith(state.clientNonce)) {
    throw new Error(
      "postgres: SCRAM server nonce does not start with the client nonce — aborting " +
        "(RFC 5802 §5.1); this is either a broken server or a replay/MITM attempt",
    );
  }

  const saltedPassword = await hi(state.password, salt, iterations);
  const clientKey = await hmacSha256(saltedPassword, "Client Key");
  const storedKey = await sha256(clientKey);

  const clientFinalMessageWithoutProof = `c=${CHANNEL_BINDING},r=${fullNonce}`;
  const authMessage =
    `${state.clientFirstMessageBare},${serverFirstMessage},${clientFinalMessageWithoutProof}`;

  const clientSignature = await hmacSha256(storedKey, authMessage);
  const clientProof = xor(clientKey, clientSignature);

  const serverKey = await hmacSha256(saltedPassword, "Server Key");
  const expectedServerSignature = await hmacSha256(serverKey, authMessage);

  return {
    clientFinalMessage: `${clientFinalMessageWithoutProof},p=${toBase64(clientProof)}`,
    expectedServerSignature,
  };
}

/**
 * Verify the server's final message (`v=<ServerSignature>`) against the
 * value computed in {@link computeClientFinal}. Throws — never returns
 * `false` — because there is no legitimate continuation once mutual auth
 * has failed: pinned mechanism 2, the check a hand-rolled SCRAM most
 * commonly skips.
 */
export function verifyServerFinalMessage(
  serverFinalMessage: string,
  expectedServerSignature: Uint8Array,
): void {
  const attrs = new Map<string, string>();
  for (const part of serverFinalMessage.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    attrs.set(part.slice(0, eq), part.slice(eq + 1));
  }
  const error = attrs.get("e");
  if (error !== undefined) {
    throw new Error(`postgres: SCRAM server rejected the exchange: ${error}`);
  }
  const vB64 = attrs.get("v");
  if (!vB64) {
    throw new Error(
      `postgres: malformed SCRAM server-final-message (missing v=): ${serverFinalMessage}`,
    );
  }
  let actual: Uint8Array;
  try {
    actual = fromBase64(vB64);
  } catch {
    throw new Error(`postgres: SCRAM server-final-message's v= is not valid base64: ${vB64}`);
  }
  if (!timingSafeEqual(actual, expectedServerSignature)) {
    throw new Error(
      "postgres: SCRAM ServerSignature verification FAILED — the server did not prove it knows " +
        "the stored key. Refusing the connection rather than trusting an unverified peer.",
    );
  }
}

/** UTF-8 decode server-sent SASL message bytes; throws on invalid UTF-8 rather than mojibake. */
export function decodeUtf8(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}
