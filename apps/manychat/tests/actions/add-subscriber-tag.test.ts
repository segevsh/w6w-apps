import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import addSubscriberTag from "../../actions/add-subscriber-tag.ts";

Deno.test("add-subscriber-tag: by name hits addTagByName", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await addSubscriberTag.execute!({ subscriberId: "1", tagName: "vip" }, ctx);
  assertEquals(calls[0].url, "https://api.manychat.com/fb/subscriber/addTagByName");
  assertEquals(JSON.parse(calls[0].body!), { subscriber_id: "1", tag_name: "vip" });
});

Deno.test("add-subscriber-tag: by id hits addTag with a numeric tag_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await addSubscriberTag.execute!({ subscriberId: "1", tagId: "42" }, ctx);
  assertEquals(calls[0].url, "https://api.manychat.com/fb/subscriber/addTag");
  assertEquals(JSON.parse(calls[0].body!), { subscriber_id: "1", tag_id: 42 });
});

Deno.test("add-subscriber-tag: the subscriber id stays a string on both paths", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }, {
    body: { status: "success" },
  }]);
  await addSubscriberTag.execute!({ subscriberId: "9007199254740993", tagId: "1" }, ctx);
  await addSubscriberTag.execute!({ subscriberId: "9007199254740993", tagName: "v" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).subscriber_id, "9007199254740993");
  assertEquals(JSON.parse(calls[1].body!).subscriber_id, "9007199254740993");
});

Deno.test("add-subscriber-tag: refuses an ambiguous tag target", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    async () => {
      await addSubscriberTag.execute!({ subscriberId: "1", tagId: "1", tagName: "v" }, ctx);
    },
    Error,
  );
  assert(err.message.includes("exactly one"), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("add-subscriber-tag: is idempotent — tags are a set, not a counter", () => {
  assertEquals(addSubscriberTag.idempotent, true);
});
