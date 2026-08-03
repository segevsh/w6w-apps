import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/document-get-status.ts";

Deno.test("document-get-status: GETs /documents/{id} — the status route, not /details", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "d1", name: "MSA", status: "document.uploaded" } },
  ]);
  const out = await action.execute({ documentId: "d1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/public/v1/documents/d1");
  assertEquals(out, { id: "d1", name: "MSA", status: "document.uploaded" });
});

Deno.test("document-get-status: URL-encodes the document id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ documentId: "a/b c" }, ctx);
  assertEquals(pathOf(calls[0]), "/public/v1/documents/a%2Fb%20c");
});

Deno.test("document-get-status: reports document.draft, the state Send needs", async () => {
  const { ctx } = mockCtx([{ body: { id: "d1", status: "document.draft" } }]);
  const out = await action.execute({ documentId: "d1" }, ctx) as { status: string };
  assertEquals(out.status, "document.draft");
});

Deno.test("document-get-status: surfaces a 404 rather than returning an empty result", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { type: "not_found", detail: "Not found." } }]);
  const err = await assertRejects(async () => {
    await action.execute({ documentId: "nope" }, ctx);
  }, Error);
  assertEquals(err.message.includes("PandaDoc 404"), true, err.message);
});

Deno.test("document-get-status: is a read action", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "document");
});
