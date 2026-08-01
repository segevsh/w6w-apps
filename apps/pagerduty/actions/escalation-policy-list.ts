import type { ActionDefinition } from "@w6w/types";
import { csv, PagerDutyClient } from "../lib/client.ts";

/** `GET /escalation_policies` */
const action: ActionDefinition = {
  key: "escalation-policy-list",
  type: "read",
  resource: "escalation-policy",
  title: "List escalation policies",
  description: "List escalation policies, optionally filtered by name, user or team.",
  params: [
    { key: "returnAll", label: "Return All", type: "boolean", default: false },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    {
      key: "query",
      label: "Name Filter",
      type: "string",
      default: "",
      hint: "Filters results to policies whose name matches this query",
    },
    {
      key: "userIds",
      label: "User IDs",
      type: "string",
      default: "",
      hint: "Comma-separated; only policies where any of these users is a target",
    },
    { key: "teamIds", label: "Team IDs", type: "string", default: "", hint: "Comma-separated" },
  ],

  async execute(input, ctx) {
    const p = input as {
      returnAll?: boolean;
      limit?: number;
      query?: string;
      userIds?: string;
      teamIds?: string;
    };
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 100);

    ctx.log("info", "listing PagerDuty escalation policies", { returnAll, limit });

    const client = new PagerDutyClient(ctx);
    return await client.requestAll(
      "/escalation_policies",
      "escalation_policies",
      {
        query: { query: p.query || undefined, user_ids: csv(p.userIds), team_ids: csv(p.teamIds) },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
