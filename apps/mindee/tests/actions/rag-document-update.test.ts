import { assertEquals } from "@std/assert";
import ragDocumentUpdate from "../../actions/rag-document-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("rag-document-update: PATCHes status only when annotation is omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "doc1", status: "Active" } }]);
  await ragDocumentUpdate.execute({ documentId: "doc1", status: "Active" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v2/products/extraction/rag-documents/doc1");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { status: "Active" });
});

Deno.test("rag-document-update: parses a text annotation into JSON before sending", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "doc1", status: "Active" } }]);
  await ragDocumentUpdate.execute(
    { documentId: "doc1", annotation: '{"fields":[{"name":"total"}]}' },
    ctx,
  );

  assertEquals(JSON.parse(calls[0].body ?? "{}"), { annotation: { fields: [{ name: "total" }] } });
});
