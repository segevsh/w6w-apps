/**
 * The Postgres frontend/backend protocol, version 3.0 — just enough of it for
 * startup, SCRAM auth, and Simple Query. Verified against PostgreSQL's own
 * protocol documentation (`https://www.postgresql.org/docs/current/protocol-message-formats.html`).
 *
 * ## Why this is a library and not inline in `auth/postgres.ts` / `actions/query.ts`
 *
 * Both the handshake hook and the `query` action need to turn bytes off the
 * wire into structured messages, and both need the SAME hard-won rule to do
 * it correctly: **a `read()` is not a message.** `ctx.socket.read()` (and,
 * during the handshake, the host's own `received`) hands back whatever
 * arrived on the TCP stream, which routinely batches several Postgres
 * messages into one read and just as routinely splits one message across
 * two. {@link FrameReader} is the one piece of code that owns reassembling a
 * byte stream into complete frames, so that rule only has to be gotten right
 * once.
 *
 * ## The other rule this file exists to get right
 *
 * Every message except {@link encodeStartupMessage}'s (the one frame with no
 * type byte) is `1-byte type + Int32 length`, and that length counts its
 * OWN four bytes but never the type byte before it — so a naive
 * `type byte + length bytes of payload` reader is off by four on every
 * single frame. {@link FrameReader.next} is written and tested against that
 * exact arithmetic.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function decodeUtf8(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}

/** `3 << 16 | 0` — StartupMessage's protocol version field, unchanged since protocol 3.0 shipped. */
export const PROTOCOL_VERSION_3_0 = 196608;

/**
 * A frame declaring a length past this is refused rather than allocated.
 * 256 MiB is far past any legitimate auth/DataRow message; a hostile or
 * corrupt server sending a multi-gigabyte declared length is a denial-of-
 * service attempt against the CLIENT, and the only safe response is to
 * refuse before the allocation, not after it starts.
 */
export const MAX_FRAME_LENGTH = 256 * 1024 * 1024;

// --------------------------------------------------------------- encoding --

/**
 * StartupMessage — the ONE message in the protocol with no leading type
 * byte: `Int32 length, Int32 protocolVersion, (CString key, CString value)*,
 * CString ""` (a lone NUL terminates the list). `length` covers the whole
 * message, itself included.
 */
export function encodeStartupMessage(params: Record<string, string>): Uint8Array {
  const chunks: Uint8Array[] = [];
  for (const [key, value] of Object.entries(params)) {
    chunks.push(
      encoder.encode(key),
      new Uint8Array([0]),
      encoder.encode(value),
      new Uint8Array([0]),
    );
  }
  chunks.push(new Uint8Array([0])); // terminating empty CString

  const bodyLen = chunks.reduce((n, c) => n + c.length, 0);
  const totalLen = 4 + 4 + bodyLen; // length field + protocol version + body
  const buf = new Uint8Array(totalLen);
  const view = new DataView(buf.buffer);
  view.setInt32(0, totalLen);
  view.setInt32(4, PROTOCOL_VERSION_3_0);
  let offset = 8;
  for (const c of chunks) {
    buf.set(c, offset);
    offset += c.length;
  }
  return buf;
}

/** `PasswordMessage`/`SASLInitialResponse` (tag `p`): `CString mechanism, Int32 dataLen, byteN data`. */
export function encodeSASLInitialResponse(mechanism: string, data: Uint8Array): Uint8Array {
  const mech = encoder.encode(mechanism);
  const len = 4 /* length itself */ + mech.length + 1 /* NUL */ + 4 /* dataLen */ + data.length;
  const buf = new Uint8Array(1 + len);
  buf[0] = 0x70; // 'p'
  const view = new DataView(buf.buffer);
  view.setInt32(1, len);
  let offset = 5;
  buf.set(mech, offset);
  offset += mech.length;
  buf[offset] = 0;
  offset += 1;
  view.setInt32(offset, data.length);
  offset += 4;
  buf.set(data, offset);
  return buf;
}

/** `SASLResponse` (tag `p`, subsequent round trips): the raw SCRAM message, no mechanism/length prefix. */
export function encodeSASLResponse(data: Uint8Array): Uint8Array {
  const len = 4 + data.length;
  const buf = new Uint8Array(1 + len);
  buf[0] = 0x70; // 'p'
  new DataView(buf.buffer).setInt32(1, len);
  buf.set(data, 5);
  return buf;
}

/** Simple Query (tag `Q`): `CString sql`. `sql` is sent BYTE-FOR-BYTE — see pinned mechanism 1. */
export function encodeQuery(sql: string): Uint8Array {
  const body = encoder.encode(sql);
  const len = 4 + body.length + 1;
  const buf = new Uint8Array(1 + len);
  buf[0] = 0x51; // 'Q'
  new DataView(buf.buffer).setInt32(1, len);
  buf.set(body, 5);
  buf[5 + body.length] = 0;
  return buf;
}

/** Terminate (tag `X`): no body. */
export function encodeTerminate(): Uint8Array {
  return new Uint8Array([0x58, 0, 0, 0, 4]); // 'X', length=4
}

// -------------------------------------------------------- frame reassembly --

export interface BackendFrame {
  /** The single ASCII type byte, as a one-character string (`"R"`, `"T"`, `"D"`, …). */
  type: string;
  /** Everything after the 4-byte length — i.e. NOT counting the type byte or the length itself. */
  payload: Uint8Array;
}

/**
 * Reassembles backend messages from an arbitrarily-chunked byte stream.
 * `push()` never parses; `next()` returns one complete frame or `null` when
 * the buffer does not yet hold one — callers MUST treat `null` as "call
 * `read()`/wait for `received` again," never as "there is no more data,"
 * or they reproduce the exact bug pinned mechanism 3 exists to prevent.
 */
export class FrameReader {
  #chunks: Uint8Array[] = [];
  #length = 0;

  push(chunk: Uint8Array): void {
    if (chunk.length === 0) return;
    this.#chunks.push(chunk);
    this.#length += chunk.length;
  }

  #buffer(): Uint8Array {
    if (this.#chunks.length <= 1) return this.#chunks[0] ?? new Uint8Array(0);
    const out = new Uint8Array(this.#length);
    let offset = 0;
    for (const c of this.#chunks) {
      out.set(c, offset);
      offset += c.length;
    }
    this.#chunks = [out];
    return out;
  }

  /** Bytes buffered but not yet consumed by a complete frame. */
  get pending(): number {
    return this.#length;
  }

  /**
   * Remove and return whatever is currently buffered (a partial frame, or
   * one or more complete frames not yet pulled via `next()`), leaving the
   * reader empty. For a caller (the handshake hook) that cannot keep a
   * `FrameReader` instance alive across calls — `HandshakeStep.state` must
   * be plain, structured-cloneable data — and instead re-creates one per
   * call, seeded from bytes carried in `state`.
   */
  drain(): Uint8Array {
    const out = this.#buffer();
    this.#chunks = [];
    this.#length = 0;
    return out;
  }

  next(): BackendFrame | null {
    if (this.#length < 5) return null; // 1 type byte + 4-byte length, minimum
    const buf = this.#buffer();
    const type = String.fromCharCode(buf[0]);
    const declaredLen = new DataView(buf.buffer, buf.byteOffset, buf.byteLength).getInt32(1);
    if (declaredLen < 4) {
      throw new Error(
        `postgres: malformed frame (type ${JSON.stringify(type)}) — declared length ` +
          `${declaredLen} is below the minimum of 4 (it must count its own 4 length bytes)`,
      );
    }
    if (declaredLen - 4 > MAX_FRAME_LENGTH) {
      throw new Error(
        `postgres: server declared a ${declaredLen}-byte frame (type ${JSON.stringify(type)}) — ` +
          `over the ${MAX_FRAME_LENGTH}-byte guard, refusing to allocate it`,
      );
    }
    const frameEnd = 1 + declaredLen; // type byte + declared length (which covers itself)
    if (this.#length < frameEnd) return null; // not fully buffered yet

    const payload = buf.slice(5, frameEnd);
    const rest = buf.slice(frameEnd);
    this.#chunks = rest.length ? [rest] : [];
    this.#length = rest.length;
    return { type, payload };
  }
}

// ------------------------------------------------------------------ parsing --

export type AuthMessage =
  | { kind: "ok" }
  | { kind: "cleartext-password" }
  | { kind: "md5-password" }
  | { kind: "sasl"; mechanisms: string[] }
  | { kind: "sasl-continue"; data: Uint8Array }
  | { kind: "sasl-final"; data: Uint8Array }
  | { kind: "unsupported"; subtype: number };

/**
 * `Authentication*` (tag `R`) — dispatched on the leading Int32 subtype.
 * `AuthenticationCleartextPassword` (3) and `AuthenticationMD5Password` (5)
 * are returned as their OWN distinct kinds rather than folded into
 * `unsupported`, so the caller (`auth/postgres.ts`) can refuse each with a
 * clear, specific message instead of a generic "unsupported auth method" —
 * the explicit refusal this app's self-audit requires, not a silent
 * fallthrough that would try to send a password either scheme expects.
 */
export function parseAuthentication(frame: BackendFrame): AuthMessage {
  if (frame.type !== "R") {
    throw new Error(
      `postgres: parseAuthentication called on a non-Authentication frame (${frame.type})`,
    );
  }
  const view = new DataView(
    frame.payload.buffer,
    frame.payload.byteOffset,
    frame.payload.byteLength,
  );
  const subtype = view.getInt32(0);
  switch (subtype) {
    case 0:
      return { kind: "ok" };
    case 3:
      return { kind: "cleartext-password" };
    case 5:
      return { kind: "md5-password" };
    case 10: {
      const mechanisms: string[] = [];
      let offset = 4;
      while (offset < frame.payload.length) {
        const end = frame.payload.indexOf(0, offset);
        if (end < 0 || end === offset) break; // malformed, or the list's terminating empty CString
        mechanisms.push(decodeUtf8(frame.payload.slice(offset, end)));
        offset = end + 1;
      }
      return { kind: "sasl", mechanisms };
    }
    case 11:
      return { kind: "sasl-continue", data: frame.payload.slice(4) };
    case 12:
      return { kind: "sasl-final", data: frame.payload.slice(4) };
    default:
      return { kind: "unsupported", subtype };
  }
}

/**
 * `ErrorResponse` (tag `E`) — a sequence of `(1-byte field code, CString
 * value)` pairs ending in a lone zero byte. Parsed and surfaced at whatever
 * phase it arrives, per this app's self-audit — including mid-handshake,
 * where it is easiest to let an unhandled frame type fall through silently.
 */
export function parseErrorResponse(
  frame: BackendFrame,
): { fields: Record<string, string>; message: string } {
  if (frame.type !== "E") {
    throw new Error(
      `postgres: parseErrorResponse called on a non-ErrorResponse frame (${frame.type})`,
    );
  }
  const fields: Record<string, string> = {};
  let offset = 0;
  while (offset < frame.payload.length) {
    const code = frame.payload[offset];
    if (code === 0) break;
    offset += 1;
    const end = frame.payload.indexOf(0, offset);
    const valueEnd = end < 0 ? frame.payload.length : end;
    fields[String.fromCharCode(code)] = decodeUtf8(frame.payload.slice(offset, valueEnd));
    offset = valueEnd + 1;
  }
  return { fields, message: fields["M"] ?? "(ErrorResponse carried no M field)" };
}

export interface RowDescriptionField {
  name: string;
  tableOid: number;
  columnAttrNum: number;
  typeOid: number;
  typeSize: number;
  typeModifier: number;
  formatCode: number;
}

/** `RowDescription` (tag `T`): `Int16 fieldCount`, then per field the layout documented below. */
export function parseRowDescription(frame: BackendFrame): RowDescriptionField[] {
  if (frame.type !== "T") {
    throw new Error(
      `postgres: parseRowDescription called on a non-RowDescription frame (${frame.type})`,
    );
  }
  const view = new DataView(
    frame.payload.buffer,
    frame.payload.byteOffset,
    frame.payload.byteLength,
  );
  const count = view.getInt16(0);
  const fields: RowDescriptionField[] = [];
  let offset = 2;
  for (let i = 0; i < count; i++) {
    const nameEnd = frame.payload.indexOf(0, offset);
    const name = decodeUtf8(frame.payload.slice(offset, nameEnd));
    offset = nameEnd + 1;
    const tableOid = view.getInt32(offset);
    offset += 4;
    const columnAttrNum = view.getInt16(offset);
    offset += 2;
    const typeOid = view.getInt32(offset);
    offset += 4;
    const typeSize = view.getInt16(offset);
    offset += 2;
    const typeModifier = view.getInt32(offset);
    offset += 4;
    const formatCode = view.getInt16(offset);
    offset += 2;
    fields.push({ name, tableOid, columnAttrNum, typeOid, typeSize, typeModifier, formatCode });
  }
  return fields;
}

/**
 * `DataRow` (tag `D`): `Int16 columnCount`, then per column `Int32 length`
 * (**-1 means SQL NULL** — not the empty string) followed by that many raw
 * bytes when non-negative. Decoded as text-format UTF-8, which is what this
 * app always requests (it never sets a binary format code).
 */
export function parseDataRow(frame: BackendFrame): Array<string | null> {
  if (frame.type !== "D") {
    throw new Error(`postgres: parseDataRow called on a non-DataRow frame (${frame.type})`);
  }
  const view = new DataView(
    frame.payload.buffer,
    frame.payload.byteOffset,
    frame.payload.byteLength,
  );
  const count = view.getInt16(0);
  const values: Array<string | null> = [];
  let offset = 2;
  for (let i = 0; i < count; i++) {
    const len = view.getInt32(offset);
    offset += 4;
    if (len === -1) {
      values.push(null);
      continue;
    }
    values.push(decodeUtf8(frame.payload.slice(offset, offset + len)));
    offset += len;
  }
  return values;
}

/** `CommandComplete` (tag `C`): a single CString command tag, e.g. `"SELECT 3"`, `"INSERT 0 1"`. */
export function parseCommandComplete(frame: BackendFrame): string {
  if (frame.type !== "C") {
    throw new Error(
      `postgres: parseCommandComplete called on a non-CommandComplete frame (${frame.type})`,
    );
  }
  const end = frame.payload.indexOf(0);
  return decodeUtf8(frame.payload.slice(0, end < 0 ? frame.payload.length : end));
}

/** `ReadyForQuery` (tag `Z`): one transaction-status byte — `I`dle, in `T`ransaction, or `E`rrored. */
export function parseReadyForQuery(frame: BackendFrame): "idle" | "transaction" | "error" {
  if (frame.type !== "Z") {
    throw new Error(
      `postgres: parseReadyForQuery called on a non-ReadyForQuery frame (${frame.type})`,
    );
  }
  const status = frame.payload[0];
  if (status === 0x49) return "idle"; // 'I'
  if (status === 0x54) return "transaction"; // 'T'
  if (status === 0x45) return "error"; // 'E'
  throw new Error(`postgres: unrecognized ReadyForQuery transaction-status byte ${status}`);
}
