import type { ActionDefinition } from "@w6w/types";
import { DigitalOceanClient } from "../lib/client.ts";

/**
 * `GET /v2/customers/my/balance` — what the account owes right now.
 *
 * ## `month_to_date_usage` is the number that answers "are we on track"
 *
 * It is the running total for the current billing period, updated through the
 * month. Comparing it against the same point last month is the cheapest useful
 * cost alarm there is, and this is the only endpoint that reports it.
 *
 * ## `account_balance` is a credit, and a negative number is good
 *
 * DigitalOcean reports a *balance*: a negative value means the account is in
 * credit, and a positive one means money is owed. That sign convention is the
 * opposite of what "balance" suggests to most people, so this returns
 * `credit` explicitly alongside.
 *
 * ## This is the whole billing surface a token can see
 *
 * There is no per-resource cost breakdown in the API. `usage-cost` style
 * questions — which droplet is expensive — cannot be answered here, only in the
 * invoice PDF. What *can* be answered is the shape of waste, and the actions
 * that do it are `volume-list`, `snapshot-list` and `reserved-ip-list`.
 */
const action: ActionDefinition = {
  key: "billing-get",
  type: "read",
  resource: "billing",
  title: "Get the account balance",
  description:
    "Month-to-date usage and the account balance — the only billing figures the API exposes. " +
    "Note the sign: a NEGATIVE balance means the account is in credit. There is no per-resource " +
    "breakdown, so waste is found through the volume, snapshot and reserved-IP actions.",
  params: [],
  output: [
    { key: "monthToDateUsage", type: "string", label: "Running total for this billing period" },
    { key: "monthToDateBalance", type: "string", label: "Including any credit" },
    { key: "accountBalance", type: "string", label: "Negative means in credit" },
    { key: "inCredit", type: "boolean", label: "Whether the balance is a credit" },
    { key: "generatedAt", type: "string", label: "When these figures were computed" },
  ],

  async execute(_input, ctx) {
    const balance = await new DigitalOceanClient(ctx).request<{
      month_to_date_balance?: string;
      account_balance?: string;
      month_to_date_usage?: string;
      generated_at?: string;
    }>("/v2/customers/my/balance");

    // Negative is in credit — the opposite of what "balance" suggests.
    const accountBalance = Number(balance?.account_balance ?? 0);
    const inCredit = Number.isFinite(accountBalance) && accountBalance < 0;

    ctx.log("info", "read the DigitalOcean account balance", {
      monthToDateUsage: balance?.month_to_date_usage,
    });

    return {
      monthToDateUsage: balance?.month_to_date_usage,
      monthToDateBalance: balance?.month_to_date_balance,
      accountBalance: balance?.account_balance,
      inCredit,
      generatedAt: balance?.generated_at,
    };
  },
};

export default action;
