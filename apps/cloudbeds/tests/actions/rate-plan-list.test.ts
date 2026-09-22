import { assert, assertEquals } from "@std/assert";
import ratePlanList from "../../actions/rate-plan-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("rate-plan-list: GET /getRatePlans with the required date window", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ rateID: "r1" }]) }]);
  await ratePlanList.execute({ startDate: "2026-10-01", endDate: "2026-10-03" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1.3/getRatePlans");
  assertEquals(queryOf(calls[0].url), { startDate: "2026-10-01", endDate: "2026-10-03" });
});

Deno.test("rate-plan-list: startDate and endDate are declared required", () => {
  const required = new Set(ratePlanList.params!.filter((p) => p.required).map((p) => p.key));
  assert(required.has("startDate"));
  assert(required.has("endDate"));
});
