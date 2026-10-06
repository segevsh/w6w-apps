import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bot-send-chat-message.ts";

Deno.test("bot-send-chat-message: POSTs message, to and pin", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "b1" } }]);
  await action.execute!({ id: "b1", message: "hi", to: "everyone", pin: true }, ctx);
  assertEquals(calls[0].url, "https://us-west-2.recall.ai/api/v1/bot/b1/send_chat_message/");
  assertEquals(JSON.parse(calls[0].body!), { message: "hi", to: "everyone", pin: true });
});

Deno.test("bot-send-chat-message: only message is required and sent by default", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ id: "b1", message: "hi" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { message: "hi" });
  assertEquals(action.params!.filter((p) => p.required).map((p) => p.key), ["id", "message"]);
  assertEquals(action.idempotent, false);
});

Deno.test("bot-send-chat-message: a bot not in the call is reported by code", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { code: "cannot_command_unstarted_bot", detail: "Cannot send a command" },
  }]);
  await assertRejects(
    async () => await action.execute!({ id: "b1", message: "x" }, ctx),
    Error,
    "(cannot_command_unstarted_bot)",
  );
});
