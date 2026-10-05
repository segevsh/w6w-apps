import type { ActionDefinition } from "@w6w/types";
import { Ds24Client } from "../lib/client.ts";

type Input = Record<string, never>;

const statsSalesSummary: ActionDefinition<Input> = {
  key: "stats-sales-summary",
  type: "read",
  title: "Get Sales Summary",
  description: "Return revenue totals for all time, the year, quarter, month, week and day.",
  params: [],
  output: [
    { key: "for", type: "object", label: "Revenue per period" },
  ],

  execute(_input, ctx) {
    return new Ds24Client(ctx).call("statsSalesSummary", {});
  },
};

export default statsSalesSummary;
