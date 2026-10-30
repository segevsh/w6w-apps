import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-document-sync.ts";

test("create-document-sync: POSTs /documents/sync and always sends status: pending", async () => {
  const card = { id: "doc-1", status: "success", download_url: "https://x/y.pdf" };
  const { ctx, calls } = mockCtx([{ body: { document_card: card } }]);
  const result = await action.execute!(
    { documentTemplateId: "tpl-1", payload: { name: "Peter Parker" } },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/documents/sync");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.document.status, "pending");
  assertEquals(body.document.document_template_id, "tpl-1");
  assertEquals(result, card);
});

test("create-document-sync: unwraps document_card, not document", async () => {
  const { ctx } = mockCtx([{ body: { document_card: { id: "doc-1" } } }]);
  const result = await action.execute!({ documentTemplateId: "tpl-1" }, ctx);
  assertEquals(result, { id: "doc-1" });
});
