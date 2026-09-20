import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/download-file.ts";
import type { FileRef } from "@w6w/types";

/**
 * `mockCtx` (tests/_helpers.ts) only builds `ctx.fetch`/`ctx.log` — `ctx.file`
 * is not part of its contract (it predates this project). Each test that
 * needs it spreads a local fake capability alongside the mock, rather than
 * editing the shared helper.
 */
function fakeFileCapability() {
  const created: Array<{ bytes: Uint8Array; contentType: string; filename: string }> = [];
  return {
    created,
    file: {
      create(bytes: Uint8Array, meta: { contentType: string; filename: string }) {
        created.push({ bytes, contentType: meta.contentType, filename: meta.filename });
        const ref: FileRef = {
          kind: "file",
          id: "test-ref-1",
          contentType: meta.contentType,
          size: bytes.length,
          filename: meta.filename,
          expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        };
        return Promise.resolve(ref);
      },
      read(): Promise<{ ref: FileRef; bytes: Uint8Array }> {
        return Promise.reject(new Error("download-file never calls ctx.file.read"));
      },
    },
  };
}

Deno.test("download-file: GETs /files/{id}/content and creates a FileRef from the raw bytes", async () => {
  const { ctx: base, calls } = mockCtx([
    {
      body: "file contents",
      headers: {
        "content-type": "text/plain",
        "content-disposition": 'attachment; filename="notes.txt"',
      },
    },
  ]);
  const { file, created } = fakeFileCapability();
  const ctx = { ...base, file };

  const result = await action.execute!({ fileId: "123" }, ctx) as { file: FileRef };

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/files/123/content");
  assertEquals(calls[0].method, "GET");
  assertEquals(result.file.kind, "file");
  assertEquals(result.file.id, "test-ref-1");
  assertEquals(result.file.contentType, "text/plain");
  assertEquals(result.file.filename, "notes.txt");
  assertEquals(created.length, 1);
  assertEquals(new TextDecoder().decode(created[0].bytes), "file contents");
});

Deno.test("download-file: parses the RFC 5987 filename* form when present", async () => {
  const { ctx: base } = mockCtx([
    {
      body: "x",
      headers: {
        "content-type": "application/pdf",
        "content-disposition": "attachment; filename*=UTF-8''report.pdf",
      },
    },
  ]);
  const { file, created } = fakeFileCapability();
  const ctx = { ...base, file };

  const result = await action.execute!({ fileId: "1" }, ctx) as { file: FileRef };
  assertEquals(result.file.filename, "report.pdf");
  assertEquals(created.length, 1);
});

Deno.test("download-file: falls back to octet-stream / the file id when Box sends no useful headers", async () => {
  // No `body` key at all (not even `""`) — mockCtx then builds a `Response`
  // with a `null` body, the one shape the Fetch spec never auto-assigns a
  // `Content-Type` for. A string body (even empty) would get
  // "text/plain;charset=UTF-8" injected regardless of the `headers` given.
  const { ctx: base } = mockCtx([{ headers: {} }]);
  const { file, created } = fakeFileCapability();
  const ctx = { ...base, file };

  const result = await action.execute!({ fileId: "456" }, ctx) as { file: FileRef };
  assertEquals(result.file.contentType, "application/octet-stream");
  assertEquals(result.file.filename, "456");
  assertEquals(created.length, 1);
});

Deno.test("download-file: fails with a clear message, not a TypeError, when ctx.file is absent", async () => {
  const { ctx } = mockCtx([]);
  const err = await assertRejects(
    () => Promise.resolve(action.execute!({ fileId: "1" }, ctx)),
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
