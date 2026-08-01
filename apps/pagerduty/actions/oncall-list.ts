import type { ActionDefinition } from "@w6w/types";
import { csv, PagerDutyClient } from "../lib/client.ts";

/**
 * `GET /oncalls` — PagerDuty's own recommended way to answer "who is on-call
 * right now": each entry pairs a user with the escalation policy / schedule
 * / level they're on-call for, over the requested time window.
 */
const action: ActionDefinition = {
  key: "oncall-list",
  type: "read",
  resource: "oncall",
  title: "List on-call users",
  description: "List who is on-call, optionally filtered by schedule, escalation policy or user.",
  params: [
    { key: "returnAll", label: "Return All", type: "boolean", default: false },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    {
      key: "scheduleIds",
      label: "Schedule IDs",
      type: "string",
      default: "",
      hint: "Comma-separated",
    },
    {
      key: "escalationPolicyIds",
      label: "Escalation Policy IDs",
      type: "string",
      default: "",
      hint: "Comma-separated",
    },
    { key: "userIds", label: "User IDs", type: "string", default: "", hint: "Comma-separated" },
    {
      key: "earliest",
      label: "Earliest Only",
      type: "boolean",
      default: false,
      hint:
        "Only the earliest on-call for each escalation policy/level, deduplicating multi-day shifts",
    },
    { key: "since", label: "Since", type: "datetime", default: "" },
    { key: "until", label: "Until", type: "datetime", default: "" },
  ],

  async execute(input, ctx) {
    const p = input as {
      returnAll?: boolean;
      limit?: number;
      scheduleIds?: string;
      escalationPolicyIds?: string;
      userIds?: string;
      earliest?: boolean;
      since?: string;
      until?: string;
    };
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 100);

    ctx.log("info", "listing PagerDuty on-calls", { returnAll, limit });

    const client = new PagerDutyClient(ctx);
    return await client.requestAll(
      "/oncalls",
      "oncalls",
      {
        query: {
          schedule_ids: csv(p.scheduleIds),
          escalation_policy_ids: csv(p.escalationPolicyIds),
          user_ids: csv(p.userIds),
          earliest: p.earliest === true ? true : undefined,
          since: p.since || undefined,
          until: p.until || undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
