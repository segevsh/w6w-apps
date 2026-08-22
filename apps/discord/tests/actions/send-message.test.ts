import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-message.ts";

Deno.test("send-message: POSTs /channels/{id}/messages with content", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  await action.execute!({ channelId: "c1", content: "hi" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v10/channels/c1/messages");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.content, "hi");
});

Deno.test("send-message: replyToMessageId maps to message_reference.message_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  await action.execute!({ channelId: "c1", content: "hi", replyToMessageId: "orig-1" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.message_reference, { message_id: "orig-1" });
});

Deno.test("send-message: forwards embeds/flags/tts verbatim, omits undefined content", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  await action.execute!(
    {
      channelId: "c1",
      embeds: [{ title: "hi", description: "world" }],
      flags: 4096,
      tts: true,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.embeds, [{ title: "hi", description: "world" }]);
  assertEquals(body.flags, 4096);
  assertEquals(body.tts, true);
  assert(!("content" in body), "must not send content when caller omitted it");
});

// ── Mention control ────────────────────────────────────────────────────────
// Discord's default is that every mention in the text pings, @everyone
// included. A workflow relaying content it did not author had no way to stop
// that; these cover the control that was added.

Deno.test("send-message: suppressAllMentions sends the empty parse array", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  await action.execute!(
    { channelId: "c1", content: "@everyone hi", suppressAllMentions: true },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).allowed_mentions, { parse: [] });
});

Deno.test("send-message: a hand-written allowedMentions object rides through", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  await action.execute!(
    { channelId: "c1", content: "hi", allowedMentions: { parse: ["users"] } },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).allowed_mentions, { parse: ["users"] });
});

Deno.test("send-message: the suppress checkbox wins over a hand-written object", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  await action.execute!(
    {
      channelId: "c1",
      content: "hi",
      suppressAllMentions: true,
      allowedMentions: { parse: ["everyone"] },
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).allowed_mentions, { parse: [] });
});

Deno.test("send-message: allowed_mentions is omitted when neither is set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  await action.execute!({ channelId: "c1", content: "hi" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).allowed_mentions, undefined);
});

Deno.test("send-message: components and sticker ids are forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  const components = [{
    type: 1,
    components: [{ type: 2, label: "Go", style: 5, url: "https://x" }],
  }];
  await action.execute!(
    { channelId: "c1", content: "hi", components, stickerIds: ["s1", "", "s2"] },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.components, components);
  assertEquals(body.sticker_ids, ["s1", "s2"]);
});
