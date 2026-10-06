import { define } from "../lib/actions.ts";
import { call } from "../lib/client.ts";

/** `GET /quotas` (scope `accounts.read`) — per-feature `{limit, used}` counters, including the API rate windows. */
export default define(
  {
    key: "quota-get",
    type: "read",
    title: "Get Account Quotas",
    description:
      "The account's usage against its plan limits, including the API request windows (per second, minute, day, month). Needs the `accounts.read` scope.",
  },
  [],
  [{ key: "quotas", type: "json", label: "Feature → {limit, used}" }],
  async (_input, ctx) => ({ quotas: await call(ctx, "/quotas") }),
);
