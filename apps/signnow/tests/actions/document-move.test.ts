import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import documentMove from "../../actions/document-move.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

test("document-move: POSTs folder_id to /document/{id}/move", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "success" } }]);
  await documentMove.execute({ documentId: "doc-1", folderId: "folder-1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/document/doc-1/move");
  assertEquals(bodyOf(calls[0]), { folder_id: "folder-1" });
});
