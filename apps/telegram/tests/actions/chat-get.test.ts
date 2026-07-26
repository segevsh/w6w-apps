import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/chat-get.ts";

Deno.test("chat-get: GETs getChat with chat_id in the query", async () => {
  const chat = { id: 1, type: "supergroup", title: "Acme" };
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: chat } }]);
  assertEquals(await action.execute({ chatId: "@acme" }, ctx), chat);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).searchParams.get("chat_id"), "@acme");
});

Deno.test("chat-get: is a read action (no side effects to make idempotent)", () => {
  assertEquals(action.type, "read");
});
