import type { ActionDefinition } from "@w6w/types";
import { EverhourClient, one } from "../lib/client.ts";

/**
 * `GET /team/time` — List time records for the whole team.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  from?: string;
  to?: string;
  limit?: number;
  page?: number;
  includeBilling?: boolean;
}

const timeList: ActionDefinition<Input> = {
  key: "time-list",
  type: "search",
  resource: "time-record",
  title: "List Team Time Records",
  description: "List time records for the whole team.",
  params: [
    { key: "from", label: "From", type: "date", hint: "Start date, YYYY-MM-DD." },
    { key: "to", label: "To", type: "date", hint: "End date, YYYY-MM-DD." },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      hint: "Max records per page; the vendor maximum is 50000.",
    },
    { key: "page", label: "Page", type: "number", hint: "Results page, starting at 1." },
    {
      key: "includeBilling",
      label: "Include billing",
      type: "boolean",
      hint:
        "Adds `billing` (rate and amount, in cents) when your key belongs to an admin with billing permission; otherwise the vendor omits it.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Records" },
    { key: "count", type: "number", label: "Records in this response" },
    {
      key: "nextPage",
      type: "number",
      label: "Next page number, or null when there is no further page",
    },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).many(`/team/time`, {
      query: {
        "from": input.from,
        "to": input.to,
        "page": input.page,
        "limit": input.limit,
        "opts_include_billing": one(input.includeBilling),
      },
    });
  },
};

export default timeList;
