import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-message.ts";

Deno.test("create-message: POSTs to spaces/{space}/messages with just the text", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "spaces/A1/messages/B1" } }]);
  await action.execute!({ space: "A1", text: "hello" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/A1/messages");
  assertEquals(JSON.parse(calls[0].body!), { text: "hello" });
});

Deno.test("create-message: accepts a qualified space name without doubling the prefix", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "spaces/A1", text: "hi" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/A1/messages");
});

Deno.test("create-message: a thread id becomes a full thread resource name in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "A1", text: "hi", thread: "T1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).thread, { name: "spaces/A1/threads/T1" });
});

Deno.test("create-message: a full thread resource name is used as given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "A1", text: "hi", thread: "spaces/A9/threads/T9" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).thread, { name: "spaces/A9/threads/T9" });
});

Deno.test("create-message: threadKey is used only when no thread name is given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute!({ space: "A1", text: "hi", threadKey: "k" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).thread, { threadKey: "k" });
  // `thread` wins — Google rejects a Thread carrying both.
  await action.execute!({ space: "A1", text: "hi", thread: "T1", threadKey: "k" }, ctx);
  assertEquals(JSON.parse(calls[1].body!).thread, { name: "spaces/A1/threads/T1" });
});

Deno.test("create-message: privateMessageViewer is wrapped as a User object", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "A1", text: "hi", privateMessageViewer: "users/123" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).privateMessageViewer, { name: "users/123" });
});

Deno.test("create-message: messageId and messageReplyOption are query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    space: "A1",
    text: "hi",
    messageId: "client-abc",
    messageReplyOption: "REPLY_MESSAGE_OR_FAIL",
    thread: "T1",
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("messageId"), "client-abc");
  assertEquals(p.get("messageReplyOption"), "REPLY_MESSAGE_OR_FAIL");
  // Neither leaks into the body.
  const sent = JSON.parse(calls[0].body!);
  assertEquals("messageId" in sent, false);
  assertEquals("messageReplyOption" in sent, false);
});

Deno.test("create-message: sends the invocation id as requestId so a retry does not double-post", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const withInvocation = { ...ctx, invocation: { invocationId: "inv-9" } };
  await action.execute!({ space: "A1", text: "hi" }, withInvocation as typeof ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("requestId"), "inv-9");
});

Deno.test("create-message: never sends cards or attachments — they need app authentication", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "A1", text: "hi" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  for (const k of ["cards", "cardsV2", "accessoryWidgets", "attachment", "actionResponse"]) {
    assertEquals(k in sent, false, `${k} must not be sent with a user credential`);
  }
});
