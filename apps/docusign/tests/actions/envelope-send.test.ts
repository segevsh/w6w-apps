import { assertEquals } from "@std/assert";
import { ACCOUNT_BASE, bodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/envelope-send.ts";

Deno.test("envelope-send: PUTs status=sent on the envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { envelopeId: "e1", status: "sent" } }]);
  await action.execute({ envelopeId: "e1" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0]), `${ACCOUNT_BASE}/envelopes/e1`);
  assertEquals(bodyOf(calls[0]), { status: "sent" });
});

Deno.test("envelope-send: omits resend_envelope unless it is switched on", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute({ envelopeId: "e1", resendEnvelope: false }, ctx);
  assertEquals(queryOf(calls[0]).get("resend_envelope"), "false");

  await action.execute({ envelopeId: "e1", resendEnvelope: true }, ctx);
  assertEquals(queryOf(calls[1]).get("resend_envelope"), "true");
});

Deno.test("envelope-send: logs what it is about to do", async () => {
  const { ctx, logs } = mockCtx([{ body: {} }]);
  await action.execute({ envelopeId: "e1" }, ctx);
  assertEquals(logs[0].level, "info");
  assertEquals(logs[0].data, { envelopeId: "e1" });
});

Deno.test("envelope-send: is not idempotent, because resend re-emails on every run", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
