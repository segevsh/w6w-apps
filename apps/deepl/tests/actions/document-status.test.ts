import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-status.ts";

Deno.test("document-status: POSTs document_key to /v2/document/{id} and maps fields", async () => {
  const body = { document_id: "doc-1", status: "translating", seconds_remaining: 12 };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    { documentId: "doc-1", documentKey: "key-1" },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/document/doc-1");
  assertEquals(JSON.parse(calls[0].body!), { document_key: "key-1" });
  assertEquals(result, {
    status: "translating",
    secondsRemaining: 12,
    billedCharacters: undefined,
    errorMessage: undefined,
  });
});

Deno.test("document-status: surfaces error_message when status is 'error'", async () => {
  const body = { document_id: "doc-1", status: "error", error_message: "too many pages" };
  const { ctx } = mockCtx([{ body }]);
  const result = await action.execute!({ documentId: "doc-1", documentKey: "key-1" }, ctx);
  assertEquals(result.status, "error");
  assertEquals(result.errorMessage, "too many pages");
});
