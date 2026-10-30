import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-solution.ts";

test("get-solution: GETs /solutions/{solutionId}/", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "sol1", name: "CRM" } }]);
  const result = await action.execute!({ solutionId: "sol1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/solutions/sol1/");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { id: "sol1", name: "CRM" });
});

test("get-solution: percent-encodes the id segment", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ solutionId: "a b/c" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/solutions/a%20b%2Fc/");
});
