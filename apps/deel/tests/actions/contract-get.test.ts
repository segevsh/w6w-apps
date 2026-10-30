import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contract-get.ts";

test("contract-get: fetches one contract", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "c1" } } }], { display: {} });
  await action.execute!({ contractId: "c1", expand: "milestones" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/contracts/c1");
  assertEquals(url.searchParams.getAll("expand"), ["milestones"]);
});

test("contract-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`contractId`");
  assertEquals(calls.length, 0);
});
