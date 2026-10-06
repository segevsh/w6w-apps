import { assertEquals, assertRejects } from "@std/assert";
import balance from "../../actions/timeoff-balance-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("timeoff-balance-get: GETs the balance with policyType and date", async () => {
  const { ctx, calls } = mockCtx([{ body: { totalBalanceAsOfDate: 12.5, policy: "Holiday" } }]);
  const out = await balance.execute(
    { employeeId: "11", policyType: "Holiday", date: "2026-10-06" },
    ctx,
  ) as { totalBalanceAsOfDate: number };
  assertEquals(pathOf(calls[0].url), "/v1/timeoff/employees/11/balance");
  assertEquals(queryOf(calls[0].url), { policyType: "Holiday", date: "2026-10-06" });
  assertEquals(out.totalBalanceAsOfDate, 12.5);
});

Deno.test("timeoff-balance-get: requires a policy type", async () => {
  const { ctx } = mockCtx();
  await assertRejects(() =>
    Promise.resolve(balance.execute({ employeeId: "11", policyType: "", date: "2026-10-06" }, ctx))
  );
});
