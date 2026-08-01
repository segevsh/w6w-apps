import type { ActionDefinition } from "@w6w/types";
import { csv, PagerDutyClient } from "../lib/client.ts";

/** `GET /services` */
const action: ActionDefinition = {
  key: "service-list",
  type: "read",
  resource: "service",
  title: "List services",
  description: "List services, optionally filtered by name or team.",
  params: [
    { key: "returnAll", label: "Return All", type: "boolean", default: false },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    {
      key: "query",
      label: "Name Filter",
      type: "string",
      default: "",
      hint: "Filters results to services whose name matches this query",
    },
    { key: "teamIds", label: "Team IDs", type: "string", default: "", hint: "Comma-separated" },
  ],

  async execute(input, ctx) {
    const p = input as { returnAll?: boolean; limit?: number; query?: string; teamIds?: string };
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 100);

    ctx.log("info", "listing PagerDuty services", { returnAll, limit });

    const client = new PagerDutyClient(ctx);
    return await client.requestAll(
      "/services",
      "services",
      { query: { query: p.query || undefined, team_ids: csv(p.teamIds) } },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
