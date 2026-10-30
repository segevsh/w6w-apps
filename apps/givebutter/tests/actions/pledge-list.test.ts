import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import pledgeList from "../../actions/pledge-list.ts";
import { mockCtx, pageEnvelope, pathOf } from "../_helpers.ts";

test("pledge-list: hits /pledges", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([{ id: "1" }]) }]);
  await pledgeList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/pledges");
});
