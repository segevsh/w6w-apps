import { assertEquals } from "@std/assert";
import documentProperties from "../../actions/document-properties.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("document-properties: reads documentId as a query param", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { documentId: "doc-1", status: "InProgress" },
  }]);
  const out = await documentProperties.execute({ documentId: "doc-1" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/document/properties");
  assertEquals(queryOf(calls[0]).get("documentId"), "doc-1");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { documentId: "doc-1", status: "InProgress" });
});
