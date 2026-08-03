import { assertEquals } from "@std/assert";
import { ACCOUNT_BASE, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/envelope-document-list.ts";

Deno.test("envelope-document-list: GETs /envelopes/{id}/documents", async () => {
  const { ctx, calls } = mockCtx([{
    body: { envelopeDocuments: [{ documentId: "1", name: "NDA.pdf" }] },
  }]);
  const out = await action.execute({ envelopeId: "e1" }, ctx) as {
    envelopeDocuments: Array<{ documentId: string }>;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), `${ACCOUNT_BASE}/envelopes/e1/documents`);
  assertEquals(out.envelopeDocuments[0].documentId, "1");
});

Deno.test("envelope-document-list: maps its flags to snake_case", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { envelopeId: "e1", includeMetadata: true, includeTabs: true, recipientId: "2" },
    ctx,
  );
  const q = queryOf(calls[0]);
  assertEquals(q.get("include_metadata"), "true");
  assertEquals(q.get("include_tabs"), "true");
  assertEquals(q.get("recipient_id"), "2");
});

Deno.test("envelope-document-list: is a read action grouped under document", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "document");
});
