import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx, PDF_BYTES } from "../_helpers.ts";
import { compact, readBody, toBase64, WebMergeClient } from "../../lib/client.ts";

Deno.test("compact: drops undefined, null and empty strings but keeps 0 and false", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: 0, f: false }), {
    a: 1,
    e: 0,
    f: false,
  });
});

Deno.test("toBase64: round-trips binary and large buffers", () => {
  const big = new Uint8Array(100_000).map((_, i) => i % 256);
  const back = Uint8Array.from(atob(toBase64(big)), (c) => c.charCodeAt(0));
  assertEquals(back.length, big.length);
  assertEquals(back[99_999], 99_999 % 256);
});

Deno.test("readBody: JSON, empty, and file bodies", async () => {
  assertEquals(await readBody(new Response('{"success":1}')), { success: 1 });
  assertEquals(await readBody(new Response(null)), null);
  const file = await readBody(
    new Response(PDF_BYTES as unknown as BodyInit, {
      headers: { "content-type": "application/pdf" },
    }),
  ) as { file: { sizeBytes: number } };
  assertEquals(file.file.sizeBytes, PDF_BYTES.length);
});

Deno.test("readBody: a body starting with { that is not JSON falls back to a file", async () => {
  const out = await readBody(new Response("{not json")) as { file: { sizeBytes: number } };
  assertEquals(out.file.sizeBytes, 9);
});

Deno.test("client: /api paths and root paths use different prefixes", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }, { body: { success: 1 } }]);
  const c = new WebMergeClient(ctx);
  await c.request("/documents");
  await c.requestRoot("/merge/1/k", { method: "POST", body: {} });
  assertEquals(calls[0].url, "https://www.webmerge.me/api/documents");
  assertEquals(calls[1].url, "https://www.webmerge.me/merge/1/k");
  assertEquals(calls[1].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: a 401 names the status and the likely causes", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const err = await assertRejects(() => new WebMergeClient(ctx).request("/documents"));
  assert((err as Error).message.includes("401"));
  assert((err as Error).message.includes("rejected"));
});

Deno.test("client: other errors carry the server text", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "no such document" }]);
  const err = await assertRejects(() => new WebMergeClient(ctx).request("/documents/9"));
  assert((err as Error).message.includes("no such document"));
});
