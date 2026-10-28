import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-channel-message.ts";

const CHANNEL = "19:4a95f7d8db4c4e7fae857bcebe0623e6@thread.tacv2";

Deno.test("send-channel-message: POSTs to the channel's messages collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "1616990032035" } }]);
  const out = await action.execute({
    teamId: "fbe2bf47",
    channelId: CHANNEL,
    content: "Hello World",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/teams/fbe2bf47/channels/19%3A4a95f7d8db4c4e7fae857bcebe0623e6%40thread.tacv2/messages",
  );
  assertEquals(JSON.parse(calls[0].body!), {
    body: { contentType: "html", content: "Hello World" },
  });
  assertEquals(out.id, "1616990032035");
});

Deno.test("send-channel-message: sends `body` only — everything else is optional", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ teamId: "t", channelId: CHANNEL, content: "hi" }, ctx);
  assertEquals(Object.keys(JSON.parse(calls[0].body!)), ["body"]);
});

Deno.test("send-channel-message: honours a plain-text format", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({
    teamId: "t",
    channelId: CHANNEL,
    content: "hi",
    contentType: "text",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).body.contentType, "text");
});

Deno.test("send-channel-message: includes subject and importance when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({
    teamId: "t",
    channelId: CHANNEL,
    content: "hi",
    subject: "Deploy done",
    importance: "urgent",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.subject, "Deploy done");
  assertEquals(body.importance, "urgent");
});

Deno.test('send-channel-message: drops an empty subject rather than sending ""', async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ teamId: "t", channelId: CHANNEL, content: "hi", subject: "" }, ctx);
  assertEquals("subject" in JSON.parse(calls[0].body!), false);
});

Deno.test("send-channel-message: logs the post without leaking the message content", async () => {
  const { ctx, logs } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ teamId: "t", channelId: CHANNEL, content: "secret" }, ctx);
  assertEquals(logs.length, 1);
  assertEquals(JSON.stringify(logs[0]).includes("secret"), false);
});

Deno.test("send-channel-message: is non-idempotent — a retry posts a second message", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
