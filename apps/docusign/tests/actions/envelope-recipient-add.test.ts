import { assertEquals, assertThrows } from "@std/assert";
import { ACCOUNT_BASE, bodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/envelope-recipient-add.ts";

const RECIPIENTS = '{"carbonCopies":[{"email":"cc@b.com","name":"C C","recipientId":"3"}]}';

Deno.test("envelope-recipient-add: POSTs the recipients object verbatim", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { recipientCount: "2" } }]);
  await action.execute({ envelopeId: "e1", recipients: RECIPIENTS }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), `${ACCOUNT_BASE}/envelopes/e1/recipients`);
  assertEquals(bodyOf(calls[0]), JSON.parse(RECIPIENTS));
});

Deno.test("envelope-recipient-add: passes resend_envelope through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ envelopeId: "e1", recipients: RECIPIENTS, resendEnvelope: true }, ctx);
  assertEquals(queryOf(calls[0]).get("resend_envelope"), "true");
});

Deno.test("envelope-recipient-add: rejects a non-object recipients payload", () => {
  const { ctx } = mockCtx([]);
  assertThrows(
    () => action.execute({ envelopeId: "e1", recipients: "[]" }, ctx),
    Error,
    "`recipients` must be a JSON object.",
  );
});

Deno.test("envelope-recipient-add: is a non-idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
