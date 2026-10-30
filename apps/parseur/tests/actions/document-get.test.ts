import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import documentGet from "../../actions/document-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("document-get: GETs /document/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 123, status: "PARSEDOK" } }]);
  const out = await documentGet.execute({ documentId: "123" }, ctx) as { status: string };

  assertEquals(pathOf(calls[0].url), "/document/123");
  assertEquals(out.status, "PARSEDOK");
});
