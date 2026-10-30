import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import createTag from "../../actions/create-tag.ts";

test("create-tag: POSTs { name } to the page endpoint", async () => {
  const { ctx, calls } = mockCtx([
    { body: { status: "success", data: { tag: { id: 9, name: "vip" } } } },
  ]);
  await createTag.execute!({ name: "vip" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.manychat.com/fb/page/createTag");
  assertEquals(JSON.parse(calls[0].body!), { name: "vip" });
});

test("create-tag: the result nests under data.tag, not data", async () => {
  const { ctx } = mockCtx([
    { body: { status: "success", data: { tag: { id: 9, name: "vip" } } } },
  ]);
  const out = await createTag.execute!({ name: "vip" }, ctx) as { data: { tag: { id: number } } };
  assertEquals(out.data.tag.id, 9);
});

test("create-tag: is not idempotent — a duplicate name is undefined behaviour", () => {
  assertEquals(createTag.idempotent, false);
});
