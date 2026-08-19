import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/billing-get.ts";

const balance = (accountBalance: string) => ({
  status: 200,
  body: {
    month_to_date_balance: "23.44",
    account_balance: accountBalance,
    month_to_date_usage: "23.44",
    generated_at: "2026-08-19T12:00:00Z",
  },
});

Deno.test("billing-get: reads the balance endpoint", async () => {
  const { ctx, calls } = mockCtx([balance("-10.00")]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v2/customers/my/balance");
  assertEquals(result.monthToDateUsage, "23.44");
  assertEquals(result.generatedAt, "2026-08-19T12:00:00Z");
});

/** The sign convention is the opposite of what "balance" suggests. */
Deno.test("billing-get: a negative balance is reported as credit", async () => {
  const credit = mockCtx([balance("-10.00")]);
  const inCredit = await action.execute({}, credit.ctx) as Record<string, unknown>;
  assertEquals(inCredit.inCredit, true);

  const owing = mockCtx([balance("42.00")]);
  const owed = await action.execute({}, owing.ctx) as Record<string, unknown>;
  assertEquals(owed.inCredit, false);

  const zero = mockCtx([balance("0")]);
  const settled = await action.execute({}, zero.ctx) as Record<string, unknown>;
  assertEquals(settled.inCredit, false);
});

/** There is no per-resource cost breakdown in the API. */
Deno.test("billing-get: says where waste is actually found", () => {
  assert(
    /NEGATIVE balance means the account is in credit/.test(action.description!),
    action.description,
  );
  assert(/volume, snapshot and reserved-IP actions/.test(action.description!), action.description);
  assertEquals(action.params, []);
});

Deno.test("billing-get: logs the usage figure only", async () => {
  const { ctx, logs } = mockCtx([balance("-10.00")]);
  await action.execute({}, ctx);
  assertEquals(logs[0].data, { monthToDateUsage: "23.44" });
});
