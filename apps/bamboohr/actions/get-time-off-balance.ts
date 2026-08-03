import type { ActionDefinition } from "@w6w/types";
import { BambooClient } from "../lib/client.ts";

interface Input {
  employeeId: string;
  end?: string;
  precision?: number;
}

/**
 * `GET /api/v1/employees/{employeeId}/time_off/calculator` — time off balances.
 *
 * The path says `calculator` rather than `balance` for a reason, and it is the
 * most useful thing about this endpoint: `end` is not a filter, it is the date
 * to calculate AS OF. The docs put it plainly — "The date to calculate the time
 * off balance as of, in YYYY-MM-DD format. Defaults to company today if not
 * provided. **Example: use a future date to project balance.**"
 *
 * So this answers "how much leave will they have accrued by December" as
 * naturally as "how much do they have now", which is what makes it worth wiring
 * into an approval workflow alongside List Time Off Requests.
 *
 * `precision` is decimal places on the returned balances, 0–4, default 2.
 */
const getTimeOffBalance: ActionDefinition<Input> = {
  key: "get-time-off-balance",
  type: "read",
  resource: "time-off",
  title: "Get Time Off Balance",
  description:
    "Calculate an employee's time off balances, per policy. Defaults to today, but accepts a " +
    "future date to project what they will have accrued by then.",
  params: [
    {
      key: "employeeId",
      label: "Employee ID",
      type: "string",
      required: true,
      hint: "The INTERNAL employee ID whose balances should be calculated.",
    },
    {
      key: "end",
      label: "As of date",
      type: "date",
      hint:
        "YYYY-MM-DD — the date to calculate the balance AS OF, not a filter. Defaults to company " +
        "today. Pass a future date to project an accrued balance.",
    },
    {
      key: "precision",
      label: "Decimal places",
      type: "number",
      validation: { min: 0, max: 4, integer: true },
      hint: "Decimal places for balance and usedYearToDate values. 0–4, defaults to 2.",
    },
  ],
  output: [{ key: "balances", type: "array", label: "Per-policy balances" }],

  execute(input, ctx) {
    return new BambooClient(ctx).request(
      `/employees/${encodeURIComponent(input.employeeId)}/time_off/calculator`,
      { query: { end: input.end, precision: input.precision } },
    );
  },
};

export default getTimeOffBalance;
