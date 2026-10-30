import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import listTags from "../../actions/list-tags.ts";

test("list-tags: GETs the page tags endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: [] } }]);
  await listTags.execute!({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.manychat.com/fb/page/getTags");
});

test("list-tags: sends no pagination params — the endpoint has none", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: [] } }]);
  await listTags.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assert(!listTags.params?.length);
});

test("list-tags: returns the tag array under data", async () => {
  const { ctx } = mockCtx([
    { body: { status: "success", data: [{ id: 1, name: "vip" }, { id: 2, name: "lead" }] } },
  ]);
  const out = await listTags.execute!({}, ctx) as { data: Array<{ name: string }> };
  assertEquals(out.data.map((t) => t.name), ["vip", "lead"]);
});
