import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/deactivate-chat.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("deactivate-chat: sends id (not chat_id) and the override flag", async () => {
  const { ctx, calls } = mockCtx([{ body: "" }]);
  const out = await action.execute({ chatId: "C1", ignoreRequesterPresence: true }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3.6/agent/action/deactivate_chat");
  assertEquals(JSON.parse(calls[0].body!), { id: "C1", ignore_requester_presence: true });
  assertEquals(out, { closed: true });
});

Deno.test("deactivate-chat: omits the flag when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ chatId: "C1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { id: "C1" });
});

Deno.test("deactivate-chat: chat_inactive is surfaced; chatId required", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: { type: "chat_inactive", message: "Chat is inactive" } },
  }]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`chatId` is required");
  await assertRejects(
    async () => await action.execute({ chatId: "C1" }, ctx),
    Error,
    "chat_inactive",
  );
});
