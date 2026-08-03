import { assert, assertEquals, assertRejects } from "@std/assert";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/document-send.ts";

Deno.test("document-send: POSTs /documents/{id}/send with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "d1", status: "document.sent" } }]);
  await action.execute({
    documentId: "d1",
    subject: "Please sign",
    message: "Here it is.",
    silent: true,
    sender: { email: "rep@acme.com" },
    replyTo: "ops@acme.com",
    forwardingSettings: { forwarding_allowed: true },
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/public/v1/documents/d1/send");
  assertEquals(bodyOf(calls[0]), {
    subject: "Please sign",
    message: "Here it is.",
    silent: true,
    sender: { email: "rep@acme.com" },
    reply_to: "ops@acme.com",
    forwarding_settings: { forwarding_allowed: true },
  });
});

Deno.test("document-send: sends an empty body when only the id is given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ documentId: "d1" }, ctx);
  assertEquals(bodyOf(calls[0]), {});
});

Deno.test("document-send: returns recipients with their shared links", async () => {
  const { ctx } = mockCtx([{
    body: {
      id: "d1",
      status: "document.sent",
      recipients: [{ id: "r1", email: "a@b.com", shared_link: "https://app.pandadoc.com/s/xyz" }],
    },
  }]);
  const out = await action.execute({ documentId: "d1" }, ctx) as {
    status: string;
    recipients: Array<{ shared_link: string }>;
  };
  assertEquals(out.status, "document.sent");
  assert(out.recipients[0].shared_link.length > 0);
});

Deno.test("document-send: a document still uploading fails loudly, not silently", async () => {
  // The realistic failure of a create-then-send workflow with no poll between.
  const { ctx } = mockCtx([{
    status: 400,
    body: { type: "validation_error", detail: "Document is not in draft status." },
  }]);
  const err = await assertRejects(async () => {
    await action.execute({ documentId: "d1" }, ctx);
  }, Error);
  assert(err.message.includes("not in draft status"), err.message);
});

Deno.test("document-send: is a non-idempotent perform — resending re-emails", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});

Deno.test("document-send: states the draft precondition in its description", () => {
  assert(/document.draft/.test(action.description ?? ""), action.description);
});
