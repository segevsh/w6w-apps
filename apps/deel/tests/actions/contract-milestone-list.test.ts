import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contract-milestone-list.ts";

Deno.test("contract-milestone-list: lists a contract's milestones", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "m1" }], page: {} } }], {
    display: {},
  });
  const result = await action.execute!({ contractId: "c1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/contracts/c1/milestones");
  assertEquals(result, [{ id: "m1" }]);
});

Deno.test("contract-milestone-list: a blank contract fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`contractId`");
  assertEquals(calls.length, 0);
});
