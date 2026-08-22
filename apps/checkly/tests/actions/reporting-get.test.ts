import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/reporting-get.ts";

Deno.test("reporting-get: reads the aggregated report", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ checkId: "c1", successRatio: 0.99 }] }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/reporting");
});

Deno.test("reporting-get: the window and tag filters reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({ from: "1787000000", to: "1787061262", filterByTags: "prod, api" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("from"), "1787000000");
  assertEquals(q.getAll("filterByTags"), ["prod", "api"]);
});

/** Monitoring data, not billing data. */
Deno.test("reporting-get: is about the checks, not the account's own usage", () => {
  assert(action.description!.includes("per check"), action.description);
});
