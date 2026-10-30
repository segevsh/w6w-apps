import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import documentAttachmentCreate from "../../actions/document-attachment-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

test("document-attachment-create: POSTs /document-attachments/ with the document resource URL", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { uuid: "att-1" } }]);
  await documentAttachmentCreate.execute({
    documentId: "doc-1",
    name: "Passport",
    fileFromUrl: "https://example.com/passport.pdf",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/api/v1/document-attachments/");
  assertEquals(bodyOf(calls[0]), {
    document: "https://signrequest.com/api/v1/documents/doc-1/",
    name: "Passport",
    file_from_url: "https://example.com/passport.pdf",
  });
});
