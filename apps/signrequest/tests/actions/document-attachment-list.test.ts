import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import documentAttachmentList from "../../actions/document-attachment-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("document-attachment-list: GETs /document-attachments/ filtered by document uuid", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { count: 0, results: [] } }]);
  await documentAttachmentList.execute({ documentUuid: "doc-1" }, ctx);
  assertEquals(pathOf(calls[0]), "/api/v1/document-attachments/");
  assertEquals(queryOf(calls[0]).get("document__uuid"), "doc-1");
});
