import { assertEquals } from "@std/assert";
import documentDelete from "../../actions/document-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-delete: DELETEs /document/{id} and reports the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await documentDelete.execute({ documentId: "123" }, ctx) as {
    documentId: string;
    status: number;
  };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/document/123");
  assertEquals(out, { documentId: "123", status: 204 });
});

Deno.test("document-delete: is idempotent", () => {
  assertEquals(documentDelete.idempotent, true);
});
