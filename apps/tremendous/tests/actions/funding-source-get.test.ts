import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import fundingSourceGet from "../../actions/funding-source-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("funding-source-get: fetches by id and unwraps the funding source", async () => {
  const fundingSource = { id: "BALANCE1", method: "balance" };
  const { ctx, calls } = mockCtx([{ status: 200, body: { funding_source: fundingSource } }]);
  const result = await fundingSourceGet.execute({ id: "BALANCE1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/funding_sources/BALANCE1");
  assertEquals(result, fundingSource);
});

test("funding-source-get: accepts the BALANCE keyword verbatim", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { funding_source: { id: "BALANCE1", method: "balance" } },
  }]);
  await fundingSourceGet.execute({ id: "BALANCE" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/funding_sources/BALANCE");
});
