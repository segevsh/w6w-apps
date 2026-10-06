import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-chat.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-chat: sends chat_id and thread_id and wraps the chat", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "C1", thread: { id: "T1" } } }]);
  const out = await action.execute({ chatId: "C1", threadId: "T1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3.6/agent/action/get_chat");
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "C1", thread_id: "T1" });
  assertEquals(out, { chat: { id: "C1", thread: { id: "T1" } } });
});

Deno.test("get-chat: omits an unset thread id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "C1" } }]);
  await action.execute({ chatId: "C1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "C1" });
});

Deno.test("get-chat: requires chatId; not_found is surfaced", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: { type: "not_found", message: "Not found" } },
  }]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`chatId` is required");
  await assertRejects(
    async () => await action.execute({ chatId: "nope" }, ctx),
    Error,
    "not_found",
  );
});
