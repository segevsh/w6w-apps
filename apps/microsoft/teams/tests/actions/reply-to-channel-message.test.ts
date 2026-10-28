import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/reply-to-channel-message.ts";

const CHANNEL = "19:4a95f7d8db4c4e7fae857bcebe0623e6@thread.tacv2";

Deno.test("reply-to-channel-message: POSTs to the message's replies collection", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: "1616990171266", replyToId: "1616990032035" },
  }]);
  const out = await action.execute({
    teamId: "fbe2bf47",
    channelId: CHANNEL,
    messageId: "1616990032035",
    content: "Hello World",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URL(calls[0].url).pathname.endsWith("/messages/1616990032035/replies"),
    true,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    body: { contentType: "html", content: "Hello World" },
  });
  assertEquals(out.replyToId, "1616990032035");
});

Deno.test("reply-to-channel-message: offers no subject — a reply has no title in Teams", () => {
  assertEquals(action.params!.map((p) => p.key).includes("subject"), false);
});

Deno.test("reply-to-channel-message: offers no reply id — Teams threads are one level deep", () => {
  assertEquals(action.params!.map((p) => p.key).includes("replyId"), false);
});

Deno.test("reply-to-channel-message: passes importance through when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({
    teamId: "t",
    channelId: CHANNEL,
    messageId: "1",
    content: "hi",
    importance: "high",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).importance, "high");
});

Deno.test("reply-to-channel-message: is non-idempotent", () => {
  assertEquals(action.idempotent, false);
});
