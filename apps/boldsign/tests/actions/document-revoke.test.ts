import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import documentRevoke from "../../actions/document-revoke.ts";
import { bodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("document-revoke: sends documentId as a query param and message in the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await documentRevoke.execute({ documentId: "doc-1", message: "sent in error" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/document/revoke");
  assertEquals(calls[0].method, "POST");
  assertEquals(queryOf(calls[0]).get("documentId"), "doc-1");
  assertEquals(bodyOf(calls[0]), { message: "sent in error" });
});

test("document-revoke: message is a required param", () => {
  const message = documentRevoke.params?.find((p) => p.key === "message");
  assertEquals(message?.required, true);
});

test("document-revoke: is declared not idempotent", () => {
  assertEquals(documentRevoke.idempotent, false);
});
