import { assert, assertEquals } from "@std/assert";
import documentStatusGet from "../../actions/document-status-get.ts";
import { errorOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-status-get: GET /v2/document/status/<parser>/<doc>", async () => {
  const resp = { filename: "a.pdf", pages: 2, failed_jobs: [] };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const out = await documentStatusGet.execute({ parserId: "p1", documentId: "d1" }, ctx);
  assertEquals(out, resp);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/document/status/p1/d1");
});

Deno.test("document-status-get: requires both ids", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await errorOf(() =>
    documentStatusGet.execute({ parserId: "p1", documentId: "" }, ctx)
  );
  assert(err.message.includes("documentId is required"));
  assertEquals(calls.length, 0);
});
