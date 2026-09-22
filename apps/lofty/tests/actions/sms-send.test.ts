import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sms-send.ts";

Deno.test("sms-send: posts to the SMS endpoint and echoes the number used", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { messageId: "m1", phoneNumber: "5865865860", phoneCode: "1" },
  }]);
  const result = await action.execute!({
    leadId: 563172647619608,
    content: "Hello, this is a test message",
  }, ctx) as { messageId: string; phoneNumber: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/message/sms/send");
  // The recipient is omitted, so Lofty falls back to the lead's own number.
  assertEquals(JSON.parse(calls[0].body!), {
    leadId: 563172647619608,
    content: "Hello, this is a test message",
  });
  assertEquals(result.phoneNumber, "5865865860");
});

Deno.test("sms-send: an explicit number and code are sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { messageId: "m2" } }]);
  await action.execute!({
    leadId: 1,
    content: "hi",
    phoneNumber: "5865865860",
    phoneCode: "1",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    leadId: 1,
    content: "hi",
    phoneNumber: "5865865860",
    phoneCode: "1",
  });
});

Deno.test("sms-send: is not idempotent — a retry sends a second message", () => {
  assertEquals(action.idempotent, false);
});
