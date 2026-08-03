import { assertEquals } from "@std/assert";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action, { PRIVATE_MESSAGE_ARCHETYPE } from "../../actions/message-create.ts";

Deno.test("message-create: POSTs /posts.json with archetype=private_message", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: { id: 11, topic_id: 5 } }]);
  const out = await action.execute(
    { title: "Hi", raw: "A private note", targetRecipients: "blake,sam" },
    ctx,
  );
  assertEquals(calls[0].url, `${SITE_URL}/posts.json`);
  assertEquals(JSON.parse(calls[0].body!), {
    title: "Hi",
    raw: "A private note",
    archetype: "private_message",
    target_recipients: "blake,sam",
  });
  assertEquals(out, { id: 11, topic_id: 5 });
});

Deno.test("message-create: uses target_recipients, never the deprecated target_usernames", async () => {
  // The reference marks `target_usernames` deprecated with "Use
  // target_recipients instead"; recipients may be groups as well as users.
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ title: "t", raw: "r", targetRecipients: " blake , sam " }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.target_recipients, "blake,sam");
  assertEquals("target_usernames" in body, false);
});

Deno.test("message-create: the archetype is a constant, not a parameter", () => {
  assertEquals(PRIVATE_MESSAGE_ARCHETYPE, "private_message");
  assertEquals(action.params!.map((p) => p.key), ["title", "raw", "targetRecipients"]);
  assertEquals(action.params!.every((p) => p.required), true);
});
