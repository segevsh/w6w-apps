import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import documentCopy from "../../actions/document-copy.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("document-copy: POSTs /document/{id}/copy/{target}", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 55 } }]);
  const out = await documentCopy.execute(
    { documentId: "9", targetMailboxId: "77" },
    ctx,
  ) as { result: { id: number } };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/document/9/copy/77");
  assertEquals(out.result.id, 55);
});

test("document-copy: is not idempotent", () => {
  assertEquals(documentCopy.idempotent, false);
});
