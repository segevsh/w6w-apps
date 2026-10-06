import { assert, assertEquals } from "@std/assert";
import documentImportUrl from "../../actions/document-import-url.ts";
import { errorOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-import-url: POSTs a form to /v2/document/fetch/<id>", async () => {
  const resp = { document_id: "d1", parser_id: "p1", remote_id: "r1", message: "scheduled" };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const out = await documentImportUrl.execute(
    { parserId: "p1", url: " https://example.com/a.pdf ", remoteId: "r1" },
    ctx,
  );
  assertEquals(out, resp);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/document/fetch/p1");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("url"), "https://example.com/a.pdf");
  assertEquals(form.get("remote_id"), "r1");
  assertEquals(calls[0].headers.api_key, undefined);
});

Deno.test("document-import-url: omits an empty remote id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await documentImportUrl.execute({ parserId: "p1", url: "https://e.com/a.pdf" }, ctx);
  assertEquals(new URLSearchParams(calls[0].body!).has("remote_id"), false);
});

Deno.test("document-import-url: is not idempotent and requires url", async () => {
  assertEquals(documentImportUrl.idempotent, false);
  const { ctx, calls } = mockCtx([]);
  const err = await errorOf(() => documentImportUrl.execute({ parserId: "p1", url: " " }, ctx));
  assert(err.message.includes("url is required"));
  assertEquals(calls.length, 0);
});
