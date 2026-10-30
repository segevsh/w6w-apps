import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import documentGet from "../../actions/document-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("document-get: calls GET /documents/{id}.json and unwraps data", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 11, name: "Retainer.pdf" }) }]);
  const out = await documentGet.execute({ id: 11 }, ctx) as { name: string };
  assertEquals(pathOf(calls[0].url), "/api/v4/documents/11.json");
  assertEquals(out.name, "Retainer.pdf");
});
