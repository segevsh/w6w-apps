import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/pay-schedule-list.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

Deno.test("pay-schedule-list: reads the company's pay schedules", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{ uuid: "ps1", frequency: "Every week" }],
  }], conn);
  const out = await action.execute!({}, ctx) as Array<{ uuid: string }>;
  assertEquals(out[0].uuid, "ps1");
  assertEquals(new URL(calls[0].url).pathname, "/v1/companies/co-1/pay_schedules");
});
