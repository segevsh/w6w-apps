import { assertEquals, assertRejects } from "@std/assert";
import smsSend from "../../actions/sms-send.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("sms-send: POSTs snake_case fields and returns the message", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1", status: "pending", sms_count: "1" } }]);
  const out = await smsSend.execute({
    sender: "61481074185",
    recipient: "61478038915",
    message: "hi",
    messageRef: "r1",
    trackLinks: true,
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/sms");
  assertEquals(bodyOf(calls[0]), {
    sender: "61481074185",
    recipient: "61478038915",
    message: "hi",
    message_ref: "r1",
    track_links: true,
  });
  assertEquals(out.id, "m1");
});

Deno.test("sms-send: omits unset optionals and sends no credential", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  await smsSend.execute({ sender: "S", recipient: "R", message: "m" }, ctx);
  assertEquals(bodyOf(calls[0]), { sender: "S", recipient: "R", message: "m" });
  assertEquals("x-api-key" in calls[0].headers, false);
});

Deno.test("sms-send: a vendor error surfaces", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "invalid sender" } }]);
  await assertRejects(
    () => Promise.resolve(smsSend.execute({ sender: "S", recipient: "R", message: "m" }, ctx)),
    Error,
    "invalid sender",
  );
});

Deno.test("sms-send: is not idempotent", () => assertEquals(smsSend.idempotent, false));
