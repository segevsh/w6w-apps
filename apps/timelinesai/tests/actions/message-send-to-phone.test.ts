import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import messageSendToPhone from "../../actions/message-send-to-phone.ts";

Deno.test("message-send-to-phone: posts to the phone", async () => {
  const { ctx, calls } = mockCtx([{ body: { "status": "ok", "data": { "message_uid": "m2" } } }]);
  const out = await messageSendToPhone.execute!(
    { "phone": "+14840000000", "text": "hello", "whatsappAccountPhone": "+14841111111" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://app.timelines.ai/integrations/api/messages");
  assertEquals(JSON.parse(calls[0].body!), {
    "phone": "+14840000000",
    "whatsapp_account_phone": "+14841111111",
    "text": "hello",
  });
  assertEquals(
    calls[0].headers["authorization"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals((out as { status: string }).status, "ok");
});

Deno.test("message-send-to-phone: surfaces a vendor error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { status: "error", message: "not found", error_code: "not_found" },
  }]);
  const err = await assertRejects(async () => {
    await messageSendToPhone.execute!(
      { "phone": "+14840000000", "text": "hello", "whatsappAccountPhone": "+14841111111" } as never,
      ctx,
    );
  }, Error);
  assert(err.message.includes("not_found"), err.message);
});

Deno.test("message-send-to-phone: refuses a message with no content, before the network", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => {
    await messageSendToPhone.execute!({ phone: "+1484" } as never, ctx);
  }, Error);
  assertEquals(calls.length, 0);
});
