import type { ActionDefinition } from "@w6w/types";
import { pageOf, WistiaClient } from "../lib/client.ts";
import { pageOutput } from "../lib/params.ts";

interface Input {
  startDate?: string;
  endDate?: string;
}

const statsAccountByDate: ActionDefinition<Input> = {
  key: "stats-account-by-date",
  type: "search",
  resource: "stats",
  title: "Get Account Stats by Date",
  description:
    "Account-wide loads, plays and hours watched per day, inclusive of both dates. Defaults to " +
    "yesterday and today. Needs the Read detailed stats permission.",
  params: [
    { key: "startDate", label: "Start date", type: "string", hint: "YYYY-MM-DD" },
    { key: "endDate", label: "End date", type: "string", hint: "YYYY-MM-DD" },
  ],
  output: [...pageOutput],

  async execute(input, ctx) {
    return pageOf(
      await new WistiaClient(ctx).json<unknown[]>("/stats/account/by_date", {
        query: { start_date: input.startDate, end_date: input.endDate },
      }),
    );
  },
};

export default statsAccountByDate;
