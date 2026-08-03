import { assert, assertEquals, assertRejects } from "@std/assert";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/document-send-reminder.ts";

const reminders = [
  { recipient_id: "r1", delivery_methods: { email: true, sms: false } },
];

Deno.test("document-send-reminder: POSTs /documents/{id}/send-reminder", async () => {
  const { ctx, calls } = mockCtx([
    { body: { result: [{ recipient_id: "r1", email: { status: "sent" } }] } },
  ]);
  const out = await action.execute({ documentId: "d1", reminders }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/public/v1/documents/d1/send-reminder");
  assertEquals(bodyOf(calls[0]), { reminders });
  assertEquals(out, { result: [{ recipient_id: "r1", email: { status: "sent" } }] });
});

Deno.test("document-send-reminder: a per-channel failure comes back as 200, not an error", async () => {
  // PandaDoc reports partial failure inside the body — the action must not
  // pretend it succeeded, nor throw.
  const { ctx } = mockCtx([{
    body: {
      result: [
        { recipient_id: "r1", email: { status: "error", detail: "Bounced." } },
      ],
    },
  }]);
  const out = await action.execute({ documentId: "d1", reminders }, ctx) as {
    result: Array<{ email: { status: string } }>;
  };
  assertEquals(out.result[0].email.status, "error");
});

Deno.test("document-send-reminder: a 409 unremindable document surfaces as an error", async () => {
  const { ctx } = mockCtx([
    { status: 409, body: { type: "conflict_error", detail: "Document is not sent." } },
  ]);
  const err = await assertRejects(
    async () => {
      await action.execute({ documentId: "d1", reminders }, ctx);
    },
    Error,
  );
  assert(err.message.includes("PandaDoc 409"), err.message);
});

Deno.test("document-send-reminder: is a non-idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
