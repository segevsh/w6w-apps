import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-block.ts";

test("get-block: GETs /blocks/{id}", async () => {
  const body = { object: "block", id: "blk-1", type: "paragraph" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute({ blockId: "blk-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/blocks/blk-1");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
