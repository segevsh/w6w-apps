/**
 * Test helpers: a mock `SocketHandle` and a mock `HookContext`, so
 * `actions/query.ts` and `auth/postgres.ts` can be unit-tested without any
 * live database — the scope of this node.
 */
import type { HookContext, SocketHandle } from "@w6w/types";
import { type BackendFrame, FrameReader } from "../lib/wire.ts";

export interface MockSocket {
  socket: SocketHandle;
  writes: Uint8Array[];
  closed: boolean;
}

/**
 * `reads` is the exact sequence of chunks `socket.read()` hands back, one
 * queued chunk per call — the caller controls the fragmentation (one big
 * chunk, byte-at-a-time, several messages batched into one) to exercise
 * pinned mechanism 3. `read()` after the queue is exhausted resolves `null`
 * (EOF) by default, matching a server that closed the connection.
 */
export function mockSocket(reads: Uint8Array[] = []): MockSocket {
  const queue = [...reads];
  const writes: Uint8Array[] = [];
  const state: MockSocket = {
    writes,
    closed: false,
    socket: {
      write(bytes: Uint8Array) {
        writes.push(bytes);
        return Promise.resolve();
      },
      read(_max?: number) {
        const next = queue.shift();
        return Promise.resolve(next ?? null);
      },
      close() {
        state.closed = true;
        return Promise.resolve();
      },
    },
  };
  return state;
}

export function mockCtx(reads: Uint8Array[] = []): { ctx: HookContext; mock: MockSocket } {
  const mock = mockSocket(reads);
  const ctx: HookContext = {
    fetch: (() => {
      throw new Error("mockCtx: this app never calls ctx.fetch");
    }) as unknown as typeof fetch,
    log: () => {},
    socket: mock.socket,
  };
  return { ctx, mock };
}

/** Splits a byte array into `n`-byte pieces — the "byte-at-a-time" read simulation. */
export function chunk(bytes: Uint8Array, size: number): Uint8Array[] {
  const out: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i += size) out.push(bytes.slice(i, i + size));
  return out;
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

// ------------------------------------------------------- backend fixtures --
// Hand-built raw backend frames, so tests can drive `FrameReader`/`auth/
// postgres.ts`/`actions/query.ts` against server replies without a live
// server. Deliberately independent of `lib/wire.ts`'s own encoders — these
// exist to construct the INPUT side of the wire, `lib/wire.ts` only ever
// needs to encode the OUTPUT side, so there is no risk of a test validating
// itself against its own encoder.

const enc = new TextEncoder();
const cstring = (s: string) => concatBytes(enc.encode(s), new Uint8Array([0]));

/** `type` byte + Int32 length (counts itself, not the type byte) + `payload`. */
export function frame(type: string, payload: Uint8Array): Uint8Array {
  const len = 4 + payload.length;
  const buf = new Uint8Array(1 + len);
  buf[0] = type.charCodeAt(0);
  new DataView(buf.buffer).setInt32(1, len);
  buf.set(payload, 5);
  return buf;
}

function int32(n: number): Uint8Array {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setInt32(0, n);
  return buf;
}

function int16(n: number): Uint8Array {
  const buf = new Uint8Array(2);
  new DataView(buf.buffer).setInt16(0, n);
  return buf;
}

export const authOk = () => frame("R", int32(0));
export const authCleartext = () => frame("R", int32(3));
export const authMd5 = () => frame("R", concatBytes(int32(5), new Uint8Array(4)));
export const authSasl = (mechanisms: string[]) =>
  frame("R", concatBytes(int32(10), ...mechanisms.map(cstring), new Uint8Array([0])));
export const authSaslContinue = (data: string) =>
  frame("R", concatBytes(int32(11), enc.encode(data)));
export const authSaslFinal = (data: string) => frame("R", concatBytes(int32(12), enc.encode(data)));

export const errorResponse = (fields: Record<string, string>) =>
  frame(
    "E",
    concatBytes(
      ...Object.entries(fields).flatMap((
        [code, value],
      ) => [new Uint8Array([code.charCodeAt(0)]), cstring(value)]),
      new Uint8Array([0]),
    ),
  );

export const noticeResponse = (fields: Record<string, string> = { S: "NOTICE", M: "hello" }) =>
  frame(
    "N",
    concatBytes(
      ...Object.entries(fields).flatMap((
        [code, value],
      ) => [new Uint8Array([code.charCodeAt(0)]), cstring(value)]),
      new Uint8Array([0]),
    ),
  );

export const parameterStatus = (name: string, value: string) =>
  frame("S", concatBytes(cstring(name), cstring(value)));

export const backendKeyData = (pid: number, secret: number) =>
  frame("K", concatBytes(int32(pid), int32(secret)));

export const rowDescription = (names: string[]) =>
  frame(
    "T",
    concatBytes(
      int16(names.length),
      ...names.map((name) =>
        concatBytes(cstring(name), int32(0), int16(0), int32(25), int16(-1), int32(-1), int16(0))
      ),
    ),
  );

/** `null` encodes as length `-1`; any string (including `""`) encodes as its UTF-8 bytes. */
export const dataRow = (values: Array<string | null>) =>
  frame(
    "D",
    concatBytes(
      int16(values.length),
      ...values.map((v) =>
        v === null ? int32(-1) : concatBytes(int32(enc.encode(v).length), enc.encode(v))
      ),
    ),
  );

export const commandComplete = (tag: string) => frame("C", cstring(tag));

export const readyForQuery = (status: "I" | "T" | "E" = "I") =>
  frame("Z", new Uint8Array([status.charCodeAt(0)]));

/**
 * Decode a single raw, complete frame (as built by `frame()`/`authOk()`/etc.
 * above) into the `BackendFrame` shape `lib/wire.ts`'s `parse*` functions
 * expect — via the SAME `FrameReader` those functions are tested against
 * elsewhere, never a hand-rolled slice, so this helper cannot itself hide a
 * framing bug.
 */
export function readFrame(bytes: Uint8Array): BackendFrame {
  const reader = new FrameReader();
  reader.push(bytes);
  const f = reader.next();
  if (!f) throw new Error("readFrame: fixture bytes did not contain one complete frame");
  return f;
}
