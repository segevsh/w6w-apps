import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/content-block-get.ts";

test("content-block-get: sends content_block_id and include_inclusion_data", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { name: "footer" } }], {
    display: { instance: "iad-01" },
  });
  const result = await action.execute!({
    contentBlockId: "cb1",
    includeInclusionData: true,
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/content_blocks/info");
  assertEquals(q.get("content_block_id"), "cb1");
  assertEquals(q.get("include_inclusion_data"), "true");
  assertEquals(result, { name: "footer" });
});
