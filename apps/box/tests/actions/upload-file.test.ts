import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/upload-file.ts";
import type { FileRef } from "@w6w/types";

/**
 * `mockCtx`'s `fetchImpl` (tests/_helpers.ts, not touched by this node)
 * captures any non-string `init.body` via `String(init.body)` — for a
 * `Uint8Array` that is `Array.prototype.join`'s comma-separated decimal
 * form ("0,255,254,…"), never the bytes as text. It is still fully
 * reversible: split on "," and re-parse as numbers reconstructs the exact
 * bytes `ctx.fetch` was actually given.
 */
function bytesFromMockBody(body: string): Uint8Array {
  return Uint8Array.from(body.split(",").map(Number));
}

function indexOfBytes(haystack: Uint8Array, needle: Uint8Array): number {
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

/** A payload no UTF-8 decoder round-trips: NUL, 0xFF, 0xFE, a lone 0x80. */
const BINARY = new Uint8Array([0x00, 0xff, 0xfe, 0x80, 0x21]);

function fakeFileCapability(ref: FileRef, bytes: Uint8Array) {
  const reads: Array<FileRef | string> = [];
  return {
    reads,
    file: {
      read(r: FileRef | string): Promise<{ ref: FileRef; bytes: Uint8Array }> {
        reads.push(r);
        return Promise.resolve({ ref, bytes });
      },
      create(): Promise<FileRef> {
        return Promise.reject(new Error("upload-file never calls ctx.file.create"));
      },
    },
  };
}

const REF: FileRef = {
  kind: "file",
  id: "file-1",
  contentType: "application/octet-stream",
  size: BINARY.length,
  filename: "payload.bin",
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
};

Deno.test("upload-file: POSTs to the upload host with a multipart body, attributes before file, real bytes", async () => {
  const entries = { entries: [{ id: "1", name: "invoice.txt" }] };
  const { ctx: base, calls } = mockCtx([{ body: entries }]);
  const { file, reads } = fakeFileCapability(REF, BINARY);
  const ctx = { ...base, file };

  const result = await action.execute!(
    { fileName: "invoice.txt", content: REF, parentId: "0" },
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://upload.box.com/api/2.0/files/content");
  assertEquals(calls[0].method, "POST");
  assert(calls[0].headers["content-type"].startsWith("multipart/form-data; boundary="));
  assertEquals(reads.length, 1);
  assertEquals(reads[0], REF);

  const bytes = bytesFromMockBody(calls[0].body!);
  const attributesIdx = indexOfBytes(bytes, new TextEncoder().encode('name="attributes"'));
  const fileIdx = indexOfBytes(bytes, new TextEncoder().encode('name="file"'));
  assert(attributesIdx >= 0 && fileIdx >= 0, "both parts present");
  assert(attributesIdx < fileIdx, "attributes part must precede the file part");
  assert(indexOfBytes(bytes, new TextEncoder().encode('"name":"invoice.txt"')) >= 0);
  assert(indexOfBytes(bytes, new TextEncoder().encode('"parent":{"id":"0"}')) >= 0);
  // The exact non-UTF-8 payload bytes must appear verbatim, past the file part's headers.
  const payloadIdx = indexOfBytes(bytes, BINARY);
  assert(payloadIdx > fileIdx, "payload bytes must appear inside the file part");
  assertEquals(result, entries);
});

Deno.test("upload-file: forwards a given parentId", async () => {
  const { ctx: base, calls } = mockCtx([{ body: {} }]);
  const { file } = fakeFileCapability(REF, BINARY);
  const ctx = { ...base, file };
  await action.execute!({ fileName: "a.txt", content: REF, parentId: "42" }, ctx);
  const bytes = bytesFromMockBody(calls[0].body!);
  assert(indexOfBytes(bytes, new TextEncoder().encode('"parent":{"id":"42"}')) >= 0);
});

Deno.test("upload-file: accepts a bare FileRef id string and still reads real bytes via ctx.file.read", async () => {
  const { ctx: base, calls } = mockCtx([{ body: {} }]);
  const { file, reads } = fakeFileCapability(REF, BINARY);
  const ctx = { ...base, file };

  await action.execute!({ fileName: "a.bin", content: "file-1", parentId: "0" }, ctx);

  assertEquals(reads.length, 1);
  assertEquals(reads[0], "file-1");
  const bytes = bytesFromMockBody(calls[0].body!);
  assert(indexOfBytes(bytes, BINARY) >= 0, "the referenced file's bytes must reach the request");
  assertEquals(
    indexOfBytes(bytes, new TextEncoder().encode("file-1")),
    -1,
    "the bare id string must never appear verbatim in the request body",
  );
});

Deno.test("upload-file: fails with a clear message, not a TypeError, when ctx.file is absent", async () => {
  const { ctx } = mockCtx([]);
  const err = await assertRejects(
    () =>
      Promise.resolve(action.execute!({ fileName: "a.txt", content: "id", parentId: "0" }, ctx)),
    Error,
  );
  assert(
    !err.message.includes("Cannot read propert"),
    `expected a clear app-level message, got: ${err.message}`,
  );
  assert(
    err.message.includes("ctx.file"),
    `expected the message to name ctx.file, got: ${err.message}`,
  );
});
