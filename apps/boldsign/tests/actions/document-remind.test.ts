import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import documentRemind from "../../actions/document-remind.ts";
import { bodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("document-remind: sends documentId and receiverEmails as query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await documentRemind.execute(
    { documentId: "doc-1", receiverEmails: ["a@x.com", "b@x.com"] },
    ctx,
  );
  assertEquals(pathOf(calls[0]), "/v1/document/remind");
  assertEquals(calls[0].method, "POST");
  assertEquals(queryOf(calls[0]).get("documentId"), "doc-1");
  assertEquals(queryOf(calls[0]).getAll("receiverEmails"), ["a@x.com", "b@x.com"]);
});

test("document-remind: sends the message in the request body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await documentRemind.execute({ documentId: "doc-1", message: "please sign" }, ctx);
  assertEquals(bodyOf(calls[0]), { message: "please sign" });
});

test("document-remind: is declared not idempotent", () => {
  assertEquals(documentRemind.idempotent, false);
});
