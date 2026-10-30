import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contractor-list.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

test("contractor-list: reads the contractors collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ uuid: "c1" }] }], conn);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/companies/co-1/contractors");
});

/** Headcount from employee-list alone misses everyone here. */
test("contractor-list: says contractors are a separate collection", () => {
  assert(/separate collection/i.test(action.description!), action.description);
});
