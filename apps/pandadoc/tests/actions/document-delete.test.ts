import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/document-delete.ts";

Deno.test("document-delete: DELETEs /documents/{id} and echoes the id on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ documentId: "d1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0]), "/public/v1/documents/d1");
  assertEquals(calls[0].body, null);
  assertEquals(out, { documentId: "d1", deleted: true });
});

Deno.test("document-delete: a 423 locked document surfaces as an error", async () => {
  const { ctx } = mockCtx([
    { status: 423, body: { type: "document_locked", detail: "Locked for editing." } },
  ]);
  const err = await assertRejects(async () => {
    await action.execute({ documentId: "d1" }, ctx);
  }, Error);
  assert(err.message.includes("PandaDoc 423"), err.message);
});

Deno.test("document-delete: is an idempotent perform — deletion is soft and repeatable", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
