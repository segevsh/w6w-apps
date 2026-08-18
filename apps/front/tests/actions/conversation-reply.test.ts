import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/conversation-reply.ts";

/**
 * The headline behaviour: Front's `options.archive` defaults to TRUE, so a
 * reply normally takes the conversation out of the queue. This action inverts
 * that default and always sends the flag, so Front's can never apply.
 */
Deno.test("conversation-reply: archive is sent explicitly, and defaults to false", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { id: "msg_1" } }]);
  await action.execute!({ conversationId: "cnv_1", body: "on it" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assert("archive" in sent.options, "the flag must be present, not left to Front's default");
  assertEquals(sent.options.archive, false);
});

Deno.test("conversation-reply: asking to archive does archive", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { id: "msg_1" } }]);
  await action.execute!({ conversationId: "cnv_1", body: "done", archive: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).options.archive, true);
});

Deno.test("conversation-reply: the param hint warns about Front's own default", () => {
  const p = (action.params as Array<{ key: string; hint?: string; default?: unknown }>)
    .find((p) => p.key === "archive")!;
  assertEquals(p.default, false);
  assert(/default is `true`/.test(p.hint!), p.hint);
});

Deno.test("conversation-reply: recipients, author and channel reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { id: "msg_1" } }]);
  await action.execute!({
    conversationId: "cnv_1",
    body: "<p>hi</p>",
    to: "a@b.test, c@d.test",
    cc: "e@f.test",
    authorId: "tea_1",
    channelId: "cha_1",
    tagIds: "tag_1",
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.to, ["a@b.test", "c@d.test"]);
  assertEquals(sent.cc, ["e@f.test"]);
  assertEquals(sent.author_id, "tea_1");
  assertEquals(sent.channel_id, "cha_1");
  assertEquals(sent.options.tag_ids, ["tag_1"]);
  assertEquals(new URL(calls[0].url).pathname, "/conversations/cnv_1/messages");
});

Deno.test("conversation-reply: an empty body is refused before sending anything", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ conversationId: "cnv_1", body: "   " }, ctx),
    Error,
    "body",
  );
  assertEquals(calls.length, 0);
});

/** Sending twice sends twice — there is nothing idempotent about an email. */
Deno.test("conversation-reply: declares itself non-idempotent", () => {
  assertEquals(action.idempotent, false);
});
