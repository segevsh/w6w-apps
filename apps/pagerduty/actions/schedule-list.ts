import type { ActionDefinition } from "@w6w/types";
import { PagerDutyClient } from "../lib/client.ts";

/** `GET /schedules` */
const action: ActionDefinition = {
  key: "schedule-list",
  type: "read",
  resource: "schedule",
  title: "List on-call schedules",
  description: "List on-call schedules, optionally filtered by name.",
  params: [
    { key: "returnAll", label: "Return All", type: "boolean", default: false },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    {
      key: "query",
      label: "Name Filter",
      type: "string",
      default: "",
      hint: "Filters results to schedules whose name matches this query",
    },
  ],

  async execute(input, ctx) {
    const p = input as { returnAll?: boolean; limit?: number; query?: string };
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 100);

    ctx.log("info", "listing PagerDuty schedules", { returnAll, limit });

    const client = new PagerDutyClient(ctx);
    return await client.requestAll(
      "/schedules",
      "schedules",
      { query: { query: p.query || undefined } },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
