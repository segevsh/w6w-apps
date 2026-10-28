import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-chat-message.ts";

const CHAT = "19:2da4c29f6d7041eca70b638b43d45437@thread.v2";

Deno.test("send-chat-message: POSTs to the chat's messages collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "1616991463150", chatId: CHAT } }]);
  const out = await action.execute({ chatId: CHAT, content: "Hello world" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/chats/19%3A2da4c29f6d7041eca70b638b43d45437%40thread.v2/messages",
  );
  assertEquals(JSON.parse(calls[0].body!), {
    body: { contentType: "html", content: "Hello world" },
  });
  assertEquals(out.id, "1616991463150");
});

Deno.test("send-chat-message: honours a plain-text format", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ chatId: CHAT, content: "hi", contentType: "text" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).body.contentType, "text");
});

Deno.test("send-chat-message: passes importance through when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ chatId: CHAT, content: "hi", importance: "urgent" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).importance, "urgent");
});

Deno.test("send-chat-message: offers no subject — chat messages have no title", () => {
  assertEquals(action.params!.map((p) => p.key), [
    "chatId",
    "content",
    "contentType",
    "importance",
  ]);
});

Deno.test("send-chat-message: logs the send without leaking the message content", async () => {
  const { ctx, logs } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ chatId: CHAT, content: "secret" }, ctx);
  assertEquals(logs.length, 1);
  assertEquals(JSON.stringify(logs[0]).includes("secret"), false);
});

Deno.test("send-chat-message: is non-idempotent — a retry sends twice", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});

Deno.test("send-chat-message: says in its description that it cannot create a chat", () => {
  assertEquals(action.description?.includes("Cannot create a new chat"), true);
});
