import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import deleteTag from "../../actions/delete-tag.ts";

Deno.test("delete-tag: by id hits removeTag with a numeric tag_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await deleteTag.execute!({ tagId: "42" }, ctx);
  assertEquals(calls[0].url, "https://api.manychat.com/fb/page/removeTag");
  assertEquals(JSON.parse(calls[0].body!), { tag_id: 42 });
});

Deno.test("delete-tag: by name hits removeTagByName", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await deleteTag.execute!({ tagName: "vip" }, ctx);
  assertEquals(calls[0].url, "https://api.manychat.com/fb/page/removeTagByName");
  assertEquals(JSON.parse(calls[0].body!), { tag_name: "vip" });
});

Deno.test("delete-tag: refuses both identifiers rather than picking one", async () => {
  // Deleting the wrong tag cannot be undone, so ambiguity is refused.
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    async () => {
      await deleteTag.execute!({ tagId: "1", tagName: "vip" }, ctx);
    },
    Error,
  );
  assert(err.message.includes("exactly one"), err.message);
  assertEquals(calls.length, 0, "must not reach the network");
});

Deno.test("delete-tag: refuses neither identifier", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => {
    await deleteTag.execute!({}, ctx);
  }, Error);
  assertEquals(calls.length, 0);
});

Deno.test("delete-tag: is named far away from the per-subscriber untag", () => {
  // One path segment apart in Manychat; deliberately not one word apart here.
  assert(deleteTag.title.toLowerCase().includes("destructive"), deleteTag.title);
  assertEquals(deleteTag.idempotent, false);
});
