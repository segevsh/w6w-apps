import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/document-get.ts";

test("document-get: GETs /documents/{id}/details — the heavy route", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "d1", status: "document.completed", recipients: [{ id: "r1" }], fields: [] } },
  ]);
  const out = await action.execute({ documentId: "d1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/public/v1/documents/d1/details");
  assertEquals(out, {
    id: "d1",
    status: "document.completed",
    recipients: [{ id: "r1" }],
    fields: [],
  });
});

test("document-get: URL-encodes the document id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ documentId: "a b" }, ctx);
  assertEquals(pathOf(calls[0]), "/public/v1/documents/a%20b/details");
});

test("document-get: is a read action, distinct from the status route", () => {
  assertEquals(action.key, "document-get");
  assertEquals(action.type, "read");
  assertEquals(action.resource, "document");
});
