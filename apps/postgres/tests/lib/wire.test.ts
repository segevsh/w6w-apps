import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  encodeQuery,
  encodeSASLInitialResponse,
  encodeSASLResponse,
  encodeStartupMessage,
  FrameReader,
  MAX_FRAME_LENGTH,
  parseAuthentication,
  parseCommandComplete,
  parseDataRow,
  parseErrorResponse,
  parseReadyForQuery,
  parseRowDescription,
  PROTOCOL_VERSION_3_0,
} from "../../lib/wire.ts";
import {
  authCleartext,
  authMd5,
  authOk,
  authSasl,
  authSaslContinue,
  authSaslFinal,
  backendKeyData,
  chunk,
  commandComplete,
  concatBytes,
  dataRow,
  errorResponse,
  frame,
  noticeResponse,
  parameterStatus,
  readFrame,
  readyForQuery,
  rowDescription,
} from "../_helpers.ts";

// -------------------------------------------------------------- encoding --

Deno.test("wire: StartupMessage — no type byte, Int32 length, Int32 protocol version, NUL pairs, terminating NUL", () => {
  const msg = encodeStartupMessage({ user: "alice", database: "db1" });
  const view = new DataView(msg.buffer);
  assertEquals(view.getInt32(0), msg.length, "declared length covers the whole message");
  assertEquals(view.getInt32(4), PROTOCOL_VERSION_3_0);

  const decoder = new TextDecoder();
  const body = decoder.decode(msg.slice(8));
  assertEquals(body, "user\0alice\0database\0db1\0\0");
  assertEquals(msg[msg.length - 1], 0, "message ends on the terminating NUL");
});

Deno.test("wire: encodeQuery — tag 'Q', length counts itself but not the tag byte, NUL-terminated SQL", () => {
  const msg = encodeQuery("SELECT 1");
  assertEquals(String.fromCharCode(msg[0]), "Q");
  const declared = new DataView(msg.buffer).getInt32(1);
  assertEquals(declared, msg.length - 1, "declared length excludes the leading type byte");
  assertEquals(msg[msg.length - 1], 0);
  assertEquals(new TextDecoder().decode(msg.slice(5, msg.length - 1)), "SELECT 1");
});

Deno.test("wire: encodeSASLInitialResponse carries the mechanism name and the data length prefix", () => {
  const data = new TextEncoder().encode("n,,n=user,r=abc");
  const msg = encodeSASLInitialResponse("SCRAM-SHA-256", data);
  assertEquals(String.fromCharCode(msg[0]), "p");
  const mechEnd = msg.indexOf(0, 5);
  assertEquals(new TextDecoder().decode(msg.slice(5, mechEnd)), "SCRAM-SHA-256");
  const dataLen = new DataView(msg.buffer).getInt32(mechEnd + 1);
  assertEquals(dataLen, data.length);
});

Deno.test("wire: encodeSASLResponse carries the raw data with no mechanism name", () => {
  const data = new TextEncoder().encode("c=biws,r=abc,p=xyz");
  const msg = encodeSASLResponse(data);
  assertEquals(String.fromCharCode(msg[0]), "p");
  assertEquals(msg.slice(5), data);
});

// ------------------------------------------------------ frame reassembly --

/**
 * (f) — pinned mechanism 3. Three delivery shapes for the SAME byte stream
 * must produce IDENTICAL parsed output. (i) alone is what a parser that
 * assumes one read = one message passes by luck.
 */
Deno.test("wire: frame reassembly is identical whether delivered as one buffer, byte-at-a-time, or batched", () => {
  const stream = concatBytes(
    rowDescription(["id", "name"]),
    dataRow(["1", "alice"]),
    commandComplete("SELECT 1"),
    readyForQuery("I"),
  );

  const drain = (chunks: Uint8Array[]) => {
    const reader = new FrameReader();
    for (const c of chunks) reader.push(c);
    const out: Array<{ type: string; hex: string }> = [];
    let f = reader.next();
    while (f) {
      out.push({ type: f.type, hex: Array.from(f.payload).join(",") });
      f = reader.next();
    }
    return out;
  };

  const oneBuffer = drain([stream]);
  const byteAtATime = drain(chunk(stream, 1));
  const twoMessagesBatched = drain([
    concatBytes(rowDescription(["id", "name"]), dataRow(["1", "alice"])),
    concatBytes(commandComplete("SELECT 1"), readyForQuery("I")),
  ]);

  assertEquals(oneBuffer.map((f) => f.type), ["T", "D", "C", "Z"]);
  assertEquals(byteAtATime, oneBuffer, "byte-at-a-time must reassemble to the same frames");
  assertEquals(
    twoMessagesBatched,
    oneBuffer,
    "two messages sharing one buffer must parse identically",
  );
});

Deno.test("wire: next() returns null (not a truncated frame) when the buffer is incomplete", () => {
  const full = commandComplete("SELECT 1");
  const reader = new FrameReader();
  reader.push(full.slice(0, full.length - 2));
  assertEquals(reader.next(), null);
  reader.push(full.slice(full.length - 2));
  const f = reader.next();
  assertEquals(f?.type, "C");
});

/** (j) — the DoS arm: refused before any allocation, from the header alone. */
Deno.test("wire: a frame declaring an absurd length is refused without allocating it", () => {
  const header = new Uint8Array(5);
  header[0] = "D".charCodeAt(0);
  new DataView(header.buffer).setInt32(1, 0x7fffffff); // ~2GB declared, no payload ever sent
  const reader = new FrameReader();
  reader.push(header);
  assertThrows(() => reader.next(), Error, `over the ${MAX_FRAME_LENGTH}-byte guard`);
});

Deno.test("wire: a declared length under the 4-byte minimum is refused as malformed", () => {
  const header = new Uint8Array(5);
  header[0] = "D".charCodeAt(0);
  new DataView(header.buffer).setInt32(1, 2);
  const reader = new FrameReader();
  reader.push(header);
  assertThrows(() => reader.next(), Error, "below the minimum of 4");
});

/** NoticeResponse / ParameterStatus / BackendKeyData are correctly SIZED and skipped, never mis-parsed as data. */
Deno.test("wire: NoticeResponse, ParameterStatus and BackendKeyData are framed by their declared length, not misread as the frame after them", () => {
  const stream = concatBytes(
    noticeResponse({ S: "NOTICE", M: "a notice" }),
    parameterStatus("server_version", "16.1"),
    backendKeyData(1234, 5678),
    rowDescription(["id"]),
  );
  const reader = new FrameReader();
  reader.push(stream);
  assertEquals(reader.next()?.type, "N");
  assertEquals(reader.next()?.type, "S");
  assertEquals(reader.next()?.type, "K");
  const t = reader.next();
  assertEquals(t?.type, "T");
  assertEquals(parseRowDescription(t!).map((f) => f.name), ["id"]);
});

// ------------------------------------------------------------------ parsing --
// `readFrame()` turns a fixture's raw bytes into the `BackendFrame` shape
// `parse*` expects, via the same `FrameReader` exercised above — so these
// tests are pinning the PARSING logic, not re-testing frame reassembly.

Deno.test("wire: parseAuthentication — AuthenticationOk", () => {
  assertEquals(parseAuthentication(readFrame(authOk())), { kind: "ok" });
});

/** (h) — R/3 and R/5 are each their own distinct kind, not folded together or into "unsupported". */
Deno.test("wire: parseAuthentication distinguishes CleartextPassword (R/3) from MD5Password (R/5)", () => {
  assertEquals(parseAuthentication(readFrame(authCleartext())), { kind: "cleartext-password" });
  const md5 = parseAuthentication(readFrame(authMd5()));
  assertEquals(md5.kind, "md5-password");
  assert(md5.kind !== "cleartext-password");
});

Deno.test("wire: parseAuthentication reads the SASL mechanism list", () => {
  const auth = parseAuthentication(readFrame(authSasl(["SCRAM-SHA-256", "SCRAM-SHA-256-PLUS"])));
  assertEquals(auth, { kind: "sasl", mechanisms: ["SCRAM-SHA-256", "SCRAM-SHA-256-PLUS"] });
});

Deno.test("wire: parseAuthentication reads SASLContinue/SASLFinal payload bytes", () => {
  const cont = parseAuthentication(readFrame(authSaslContinue("r=abc,s=xyz,i=4096")));
  assert(cont.kind === "sasl-continue");
  assertEquals(new TextDecoder().decode(cont.data), "r=abc,s=xyz,i=4096");

  const fin = parseAuthentication(readFrame(authSaslFinal("v=abc123")));
  assert(fin.kind === "sasl-final");
  assertEquals(new TextDecoder().decode(fin.data), "v=abc123");
});

Deno.test("wire: parseAuthentication reports an unrecognized subtype rather than guessing", () => {
  const weird = readFrame(frame("R", new Uint8Array([0, 0, 0, 99])));
  assertEquals(parseAuthentication(weird), { kind: "unsupported", subtype: 99 });
});

/** (i)'s wire-level half — ErrorResponse's M field parses correctly at any point in the stream. */
Deno.test("wire: parseErrorResponse surfaces the M field", () => {
  const err = parseErrorResponse(
    readFrame(
      errorResponse({ S: "FATAL", C: "28P01", M: 'password authentication failed for user "x"' }),
    ),
  );
  assertEquals(err.message, 'password authentication failed for user "x"');
  assertEquals(err.fields["C"], "28P01");
});

Deno.test("wire: parseRowDescription reads field names in order", () => {
  const fields = parseRowDescription(readFrame(rowDescription(["id", "email", "created_at"])));
  assertEquals(fields.map((f) => f.name), ["id", "email", "created_at"]);
});

/** (g) — the NULL-vs-empty-string bug, asserted as two distinct values in the SAME test. */
Deno.test("wire: parseDataRow distinguishes a -1-length NULL from a 0-length empty string", () => {
  const values = parseDataRow(readFrame(dataRow([null, "", "x"])));
  assertEquals(values[0], null);
  assertEquals(values[1], "");
  assertEquals(values[2], "x");
  assert(values[0] !== values[1], "NULL and empty string must not collapse to the same value");
});

Deno.test("wire: parseCommandComplete reads the tag", () => {
  assertEquals(parseCommandComplete(readFrame(commandComplete("INSERT 0 1"))), "INSERT 0 1");
});

Deno.test("wire: parseReadyForQuery maps the transaction-status byte", () => {
  assertEquals(parseReadyForQuery(readFrame(readyForQuery("I"))), "idle");
  assertEquals(parseReadyForQuery(readFrame(readyForQuery("T"))), "transaction");
  assertEquals(parseReadyForQuery(readFrame(readyForQuery("E"))), "error");
});
