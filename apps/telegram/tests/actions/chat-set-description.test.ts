import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/chat-set-description.ts";

Deno.test("chat-set-description: POSTs setChatDescription", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: true } }]);
  await action.execute({ chatId: "1", description: "About us" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "1", description: "About us" });
});

Deno.test("chat-set-description: sends an empty string so the description can be cleared", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: true } }]);
  await action.execute({ chatId: "1" }, ctx);
  // `compact` would drop "" — clearing has to survive it, so it is sent explicitly.
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "1", description: "" });
});
