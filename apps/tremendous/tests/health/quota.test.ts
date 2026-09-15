import { assertEquals } from "@std/assert";
import quota, { BALANCE_URL } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("quota.check: reports remaining balance as ok when positive", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      funding_source: {
        method: "balance",
        meta: { available_amount: 500, currency_code: "USD" },
      },
    },
  }]);
  const report = await quota.check!({}, ctx);

  assertEquals(calls[0].url, BALANCE_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0], { id: "balance", remaining: 500, unit: "USD" });
});

Deno.test("quota.check: an exhausted balance reports down", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { funding_source: { meta: { available_amount: 0, currency_code: "USD" } } },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota.check: no BALANCE funding source is unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { errors: { message: "not found" } } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota.check: an unreadable body is unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { funding_source: {} } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
