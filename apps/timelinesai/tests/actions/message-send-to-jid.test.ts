import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import messageSendToJid from "../../actions/message-send-to-jid.ts";

Deno.test("message-send-to-jid: posts to the jid", async () => {
  const { ctx, calls } = mockCtx([{ body: { "status": "ok", "data": { "message_uid": "m3" } } }]);
  const out = await messageSendToJid.execute!(
    { "jid": "1@g.us", "text": "yo", "replyTo": "m0" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://app.timelines.ai/integrations/api/messages/to_jid");
  assertEquals(JSON.parse(calls[0].body!), { "jid": "1@g.us", "text": "yo", "reply_to": "m0" });
  assertEquals(
    calls[0].headers["authorization"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals((out as { status: string }).status, "ok");
});

Deno.test("message-send-to-jid: surfaces a vendor error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { status: "error", message: "not found", error_code: "not_found" },
  }]);
  const err = await assertRejects(async () => {
    await messageSendToJid.execute!(
      { "jid": "1@g.us", "text": "yo", "replyTo": "m0" } as never,
      ctx,
    );
  }, Error);
  assert(err.message.includes("not_found"), err.message);
});

Deno.test("message-send-to-jid: refuses a message with no content, before the network", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => {
    await messageSendToJid.execute!({ jid: "1@g.us" } as never, ctx);
  }, Error);
  assertEquals(calls.length, 0);
});
