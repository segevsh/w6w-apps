import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import fundingSourceList from "../../actions/funding-source-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("funding-source-list: lists every funding source", async () => {
  const page = { funding_sources: [{ id: "BALANCE1", method: "balance" }] };
  const { ctx, calls } = mockCtx([{ status: 200, body: page }]);
  const result = await fundingSourceList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/funding_sources");
  assertEquals(result, page);
});
