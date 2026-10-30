import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/segment-list.ts";

test("segment-list: sends page and sort_direction", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { segments: [] } }], {
    display: { instance: "iad-01" },
  });
  await action.execute!({ page: 3, sortDirection: "desc" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/segments/list");
  assertEquals(q.get("page"), "3");
  assertEquals(q.get("sort_direction"), "desc");
});
