import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { display, page } from "./_shared.ts";
import action from "../../actions/policy-list.ts";

test("policy-list: reads the policies", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "p1", name: "Information Security Policy" }])], {
    display,
  });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url.split("?")[0], "https://api.vanta.com/v1/policies");
  assertEquals(result.count, 1);
});

test("policy-list: pages to the end when asked", async () => {
  const { ctx, calls } = mockCtx([
    page([{ id: "p1" }], { hasNextPage: true, endCursor: "c1" }),
    page([{ id: "p2" }]),
  ], { display });
  const result = await action.execute!({ returnAll: true }, ctx) as { count: number };
  assertEquals(calls.length, 2);
  assertEquals(result.count, 2);
});

/** A policy update resets every acceptance. */
test("policy-list: says why the reminder workflow recurs", () => {
  assert(/resets every\s+acceptance/.test(action.description!), action.description);
});
