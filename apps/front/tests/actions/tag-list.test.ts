import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/tag-list.ts";

/** Company tags, deliberately — not one teammate's private labels. */
test("tag-list: reads the COMPANY tag collection", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { _results: [{ id: "tag_1", name: "vip" }] },
  }]);
  assertEquals(await action.execute!({}, ctx), [{ id: "tag_1", name: "vip" }]);
  assertEquals(new URL(calls[0].url).pathname, "/company/tags");
});
