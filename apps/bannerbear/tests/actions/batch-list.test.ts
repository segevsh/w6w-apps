import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import batchList from "../../actions/batch-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("batch-list: GET /batches", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uid: "b1" }] }]);
  const out = await batchList.execute({}, ctx) as unknown[];

  assertEquals(pathOf(calls[0].url), "/batches");
  assertEquals(out, [{ uid: "b1" }]);
});
