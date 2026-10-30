import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import documentHistoryGet from "../../actions/document-history-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("document-history-get: GETs /document/{id}/historyfull", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ event: "document.create" }] }]);
  const out = await documentHistoryGet.execute({ documentId: "doc-1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/document/doc-1/historyfull");
  assertEquals(Array.isArray(out), true);
});
