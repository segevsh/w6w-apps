import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/pay-period-list.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

Deno.test("pay-period-list: reads the pay calendar", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ start_date: "2026-08-01" }] }], conn);
  await action.execute!({ startDate: "2026-08-01" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/companies/co-1/pay_periods");
  assertEquals(new URL(calls[0].url).searchParams.get("start_date"), "2026-08-01");
});

/** The deadline is the date a scheduling workflow exists to beat. */
Deno.test("pay-period-list: the deadline is part of the declared output", () => {
  assert(/deadline/i.test(action.description!), action.description);
});
