/**
 * T3.1.1 — proof case: apps/box's download-file/upload-file round trip
 * through the REAL @w6w/runtime Deno Worker sandbox (not a hand-written
 * ctx), against a local HTTP server standing in for Box. Mirrors core's own
 * `packages/runtime/tests/file-capability.test.ts` in shape and rigor —
 * every assertion is on bytes the local server actually received, or on
 * bytes the host-side `onFileCreate` was actually handed, never on a value
 * the action itself returned and then re-decoded.
 *
 * NOT verified here (contract's Test plan §6): that the real Box API
 * accepts this body — no Box credential exists in this environment. The
 * local double enforces only the one vendor quirk this project already
 * knows about (part order — Box's real `400 metadata_after_file_contents`);
 * it is not a Box conformance check.
 *
 * `@w6w/runtime` is not on this app's import map (only `@w6w/types` is) —
 * reached via a relative specifier instead, exactly like any other sibling
 * repo path in this workspace.
 */
import { assert, assertEquals, assertRejects } from "@std/assert";
import type { FileRef, SignableRequest } from "@w6w/types";
import { loadApp, runHook } from "../../../../../core/packages/runtime/mod.ts";
import type { WireResponse } from "../../../../../core/packages/runtime/src/sandbox/protocol.ts";

// Avoids adding `@std/path` as a new dependency just for one conversion —
// this app's deno.lock stays untouched by this test file.
const BOX_DIR = decodeURIComponent(new URL("../..", import.meta.url).pathname);

/** Bytes no UTF-8 decoder round-trips: NUL, 0xFF, 0xFE, and a lone 0x80
 * continuation byte, mixed with printable bytes so a naive "it's basically
 * text" path doesn't accidentally look correct. */
const PAYLOAD = new Uint8Array([0x00, 0xff, 0xfe, 0x80, 0x42, 0x6f, 0x78, 0x21]);

function makeFileStore() {
  const store = new Map<string, { ref: FileRef; bytes: Uint8Array }>();
  const createdBytes: Uint8Array[] = [];
  let counter = 0;

  const onFileCreate = (
    input: { bytes: Uint8Array; contentType: string; filename: string },
  ): Promise<FileRef> => {
    createdBytes.push(input.bytes);
    const ref: FileRef = {
      kind: "file",
      id: `file-${++counter}`,
      contentType: input.contentType,
      size: input.bytes.length,
      filename: input.filename,
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    };
    store.set(ref.id, { ref, bytes: input.bytes });
    return Promise.resolve(ref);
  };

  const onFileRead = (refId: string): Promise<{ ref: FileRef; bytes: Uint8Array }> => {
    const hit = store.get(refId);
    if (!hit) return Promise.reject(new Error("unknown_file"));
    return Promise.resolve(hit);
  };

  return { onFileCreate, onFileRead, store, createdBytes };
}

/** Stands in for Box: serves the download payload, captures the raw upload body. */
function startBoxDouble() {
  let uploadBody: Uint8Array | null = null;
  const server = Deno.serve(
    { port: 0, onListen: () => {} },
    async (req) => {
      const url = new URL(req.url);
      if (req.method === "GET" && url.pathname === "/2.0/files/src-1/content") {
        return new Response(PAYLOAD, {
          status: 200,
          headers: {
            "content-type": "application/octet-stream",
            "content-disposition": 'attachment; filename="source.bin"',
          },
        });
      }
      if (req.method === "POST" && url.pathname === "/api/2.0/files/content") {
        uploadBody = new Uint8Array(await req.arrayBuffer());
        return new Response(JSON.stringify({ entries: [{ id: "999", name: "roundtrip.bin" }] }), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("not found", { status: 404 });
    },
  );
  return {
    baseUrl: `http://127.0.0.1:${server.addr.port}`,
    getUploadBody: () => uploadBody,
    close: () => server.shutdown(),
  };
}

/** Reissues the sandbox's request against the local Box double over real HTTP. */
function makeOnFetch(baseUrl: string) {
  return async (req: SignableRequest): Promise<WireResponse> => {
    const incoming = new URL(req.url);
    const target = new URL(incoming.pathname + incoming.search, baseUrl);
    const res = await fetch(target, {
      method: req.method,
      headers: req.headers,
      body: (req.body ?? undefined) as BodyInit | undefined,
    });
    const bytes = new Uint8Array(await res.arrayBuffer());
    return {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      body: bytes,
    };
  };
}

/** Byte-level search — `Uint8Array` has no typed `indexOf`-for-subsequence. */
function indexOfBytes(haystack: Uint8Array, needle: Uint8Array): number {
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

Deno.test("round trip: download-file mints a FileRef from real bytes, upload-file sends those bytes verbatim", async () => {
  const app = await loadApp(BOX_DIR);
  const box = startBoxDouble();
  const { onFileCreate, onFileRead, createdBytes } = makeFileStore();
  const onFetch = makeOnFetch(box.baseUrl);

  try {
    // Leg 1 — download. The app builds the real Box URL itself; onFetch
    // reissues the same path/method/headers against the local double, so
    // the app's own URL-building is exercised untouched.
    const downloaded = await runHook<{ file: FileRef }>({
      entryPath: app.entryPath,
      selector: { kind: "action", key: "download-file" },
      input: { fileId: "src-1" },
      readScope: app.dir,
      onFetch,
      onFileRead,
      onFileCreate,
    });

    assertEquals(downloaded.file.kind, "file");
    assertEquals(downloaded.file.contentType, "application/octet-stream");
    assertEquals(downloaded.file.filename, "source.bin");
    assertEquals(downloaded.file.size, PAYLOAD.length);
    // A3: assert on what onFileCreate was actually handed — never on the
    // action's own return value.
    assertEquals(createdBytes.length, 1);
    assertEquals(createdBytes[0], PAYLOAD);

    // Leg 2 — upload, fed the exact FileRef leg 1 produced.
    const uploaded = await runHook<{ entries: Array<{ id: string; name: string }> }>({
      entryPath: app.entryPath,
      selector: { kind: "action", key: "upload-file" },
      input: { fileName: "roundtrip.bin", content: downloaded.file, parentId: "0" },
      readScope: app.dir,
      onFetch,
      onFileRead,
      onFileCreate,
    });
    assertEquals(uploaded.entries[0].id, "999");

    // A3: assert on the raw bytes the LOCAL SERVER received — never on a
    // value the action itself returned.
    const body = box.getUploadBody();
    assert(body, "upload must have reached the local server");
    const attributesIdx = indexOfBytes(body!, new TextEncoder().encode('name="attributes"'));
    const fileIdx = indexOfBytes(body!, new TextEncoder().encode('name="file"'));
    assert(attributesIdx >= 0 && fileIdx >= 0, "both multipart parts must be present");
    // M2 pin: Box's real `400 metadata_after_file_contents` for the other order.
    assert(attributesIdx < fileIdx, "attributes part must precede the file part");

    const payloadIdx = indexOfBytes(body!, PAYLOAD);
    assert(payloadIdx > fileIdx, "the exact payload bytes must appear inside the file part");
    assertEquals(body!.subarray(payloadIdx, payloadIdx + PAYLOAD.length), PAYLOAD);
  } finally {
    await box.close();
  }
});

Deno.test("upload-file also accepts a bare FileRef id string, and still reads real bytes via ctx.file", async () => {
  const app = await loadApp(BOX_DIR);
  const box = startBoxDouble();
  const { onFileCreate, onFileRead, store } = makeFileStore();
  const onFetch = makeOnFetch(box.baseUrl);

  try {
    // Seed the store directly, as if a prior step already produced this file.
    const ref: FileRef = {
      kind: "file",
      id: "seeded-1",
      contentType: "text/plain",
      size: PAYLOAD.length,
      filename: "seeded.bin",
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    };
    store.set(ref.id, { ref, bytes: PAYLOAD });

    await runHook({
      entryPath: app.entryPath,
      selector: { kind: "action", key: "upload-file" },
      input: { fileName: "a.bin", content: ref.id, parentId: "0" },
      readScope: app.dir,
      onFetch,
      onFileRead,
      onFileCreate,
    });

    const body = box.getUploadBody();
    assert(body, "upload must have reached the local server");
    // M5 pin: the local server must receive the file's BYTES, never the id text.
    assert(
      indexOfBytes(body!, PAYLOAD) >= 0,
      "the referenced file's bytes must appear in the request body",
    );
    assertEquals(
      indexOfBytes(body!, new TextEncoder().encode(ref.id)),
      -1,
      "the bare id string must never appear verbatim in the request body",
    );
  } finally {
    await box.close();
  }
});

Deno.test("A5: ctx.file disabled fails both actions with a clear message, not a TypeError", async () => {
  const app = await loadApp(BOX_DIR);
  const box = startBoxDouble();
  const onFetch = makeOnFetch(box.baseUrl);

  try {
    const downloadErr = await assertRejects(
      () =>
        runHook({
          entryPath: app.entryPath,
          selector: { kind: "action", key: "download-file" },
          input: { fileId: "src-1" },
          readScope: app.dir,
          onFetch,
          // onFileRead / onFileCreate deliberately omitted — a host that
          // simply does not implement the capability (DC-3: whole or none).
        }),
      Error,
    );
    assert(
      !downloadErr.message.includes("Cannot read propert"),
      `expected a clear message, got: ${downloadErr.message}`,
    );

    const uploadErr = await assertRejects(
      () =>
        runHook({
          entryPath: app.entryPath,
          selector: { kind: "action", key: "upload-file" },
          input: { fileName: "a.bin", content: "whatever", parentId: "0" },
          readScope: app.dir,
          onFetch,
        }),
      Error,
    );
    assert(
      !uploadErr.message.includes("Cannot read propert"),
      `expected a clear message, got: ${uploadErr.message}`,
    );
  } finally {
    await box.close();
  }
});
