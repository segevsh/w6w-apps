import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import removeSubscriberTag from "../../actions/remove-subscriber-tag.ts";

Deno.test("remove-subscriber-tag: hits the SUBSCRIBER path, never the page one", async () => {
  // /fb/subscriber/removeTag and /fb/page/removeTag are one segment apart, and
  // the page one destroys the tag for everyone.
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await removeSubscriberTag.execute!({ subscriberId: "1", tagId: "42" }, ctx);
  assertEquals(calls[0].url, "https://api.manychat.com/fb/subscriber/removeTag");
  assert(!calls[0].url.includes("/fb/page/"));
  assertEquals(JSON.parse(calls[0].body!), { subscriber_id: "1", tag_id: 42 });
});

Deno.test("remove-subscriber-tag: by name hits removeTagByName under /fb/subscriber/", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await removeSubscriberTag.execute!({ subscriberId: "1", tagName: "vip" }, ctx);
  assertEquals(calls[0].url, "https://api.manychat.com/fb/subscriber/removeTagByName");
  assertEquals(JSON.parse(calls[0].body!), { subscriber_id: "1", tag_name: "vip" });
});

Deno.test("remove-subscriber-tag: refuses an ambiguous target", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await removeSubscriberTag.execute!({ subscriberId: "1", tagId: "1", tagName: "v" }, ctx);
    },
    Error,
  );
  assertEquals(calls.length, 0);
});

Deno.test("remove-subscriber-tag: is idempotent, unlike the destructive page-level delete", () => {
  assertEquals(removeSubscriberTag.idempotent, true);
});
