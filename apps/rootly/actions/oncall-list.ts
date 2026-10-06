import type { ActionDefinition } from "@w6w/types";
import { listResult, RootlyClient, strList } from "../lib/client.ts";

interface Input {
  since?: string;
  until?: string;
  earliest?: boolean;
  time_zone?: string;
  schedule_ids?: string;
  escalation_policy_ids?: string;
  user_ids?: string;
  service_ids?: string;
  group_ids?: string;
  include?: string[] | string;
}

/** `GET /v1/oncalls` */
const oncallList: ActionDefinition<Input> = {
  key: "oncall-list",
  type: "read",
  resource: "oncall",
  title: "List On-Calls",
  description:
    "Who is on call, by schedule and escalation policy, at a moment or over a range. Defaults to now.",
  params: [
    {
      key: "since",
      label: "Since",
      type: "string",
      hint: "Start of range, ISO 8601. Defaults to now.",
    },
    {
      key: "until",
      label: "Until",
      type: "string",
      hint: "End of range, ISO 8601. Defaults to `since`.",
    },
    {
      key: "earliest",
      label: "Earliest only",
      type: "boolean",
      hint: "Only the first on-call entry per escalation policy path and level.",
    },
    {
      key: "time_zone",
      label: "Time zone",
      type: "string",
      hint: "IANA time zone for the answer.",
    },
    {
      key: "schedule_ids",
      label: "Schedule IDs",
      type: "string",
      hint: "Comma-separated schedule IDs.",
    },
    {
      key: "escalation_policy_ids",
      label: "Escalation policy IDs",
      type: "string",
      hint: "Comma-separated escalation policy IDs.",
    },
    {
      key: "user_ids",
      label: "User IDs",
      type: "string",
      hint: "Comma-separated user IDs.",
    },
    {
      key: "service_ids",
      label: "Service IDs",
      type: "string",
      hint: "Comma-separated service IDs.",
    },
    {
      key: "group_ids",
      label: "Team IDs",
      type: "string",
      hint: "Comma-separated team IDs.",
    },
    {
      key: "include",
      label: "Include",
      type: "array",
      item: { type: "string" },
      hint: "Related records to side-load, comma-separated: user, schedule, escalation_policy.",
    },
  ],
  output: [
    {
      key: "items",
      type: "array",
      label: "Records, each flattened to its attributes plus `id` and `type`",
    },
    { key: "included", type: "array", label: "Side-loaded related records (same flattened shape)" },
    {
      key: "meta",
      type: "object",
      label: "Paging: current_page, next_page, next_cursor, total_count, total_pages",
    },
    { key: "links", type: "object", label: "Paging links: self, first, prev, next, last" },
  ],

  async execute(input, ctx) {
    const res = await new RootlyClient(ctx).request("GET", "/v1/oncalls", {
      query: {
        "since": input.since,
        "until": input.until,
        "earliest": input.earliest,
        "time_zone": input.time_zone,
        "filter[schedule_ids]": input.schedule_ids,
        "filter[escalation_policy_ids]": input.escalation_policy_ids,
        "filter[user_ids]": input.user_ids,
        "filter[service_ids]": input.service_ids,
        "filter[group_ids]": input.group_ids,
        "include": strList(input.include)?.join(","),
      },
    });
    return listResult(res);
  },
};

export default oncallList;
