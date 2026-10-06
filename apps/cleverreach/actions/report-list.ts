import type { ActionDefinition } from "@w6w/types";
import { asList, CleverReachClient, optEnum, optInt, optString, unixTime } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "report-list",
  type: "search",
  resource: "report",
  title: "List reports",
  description:
    "List mailing reports (`GET /v3/reports`). `start` and `end` must be given together. Split-test reports carry their versions in a `versions` array.",
  params: [
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "Vendor default 50.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "Max 10000.",
      validation: { integer: true, min: 0, max: 10000 },
    },
    { key: "channelId", label: "Channel ID", type: "string" },
    { key: "groupId", label: "Group ID", type: "string" },
    {
      key: "start",
      label: "Start",
      type: "string",
      hint: "Unix timestamp or ISO 8601; needs `end`.",
    },
    {
      key: "end",
      label: "End",
      type: "string",
      hint: "Unix timestamp or ISO 8601; needs `start`.",
    },
    {
      key: "mode",
      label: "Detail",
      type: "select",
      options: [{ value: "full", label: "Full" }, { value: "basic", label: "Basic" }],
    },
  ],
  output: [
    { key: "items", type: "array", label: "Records on this page" },
    { key: "count", type: "number", label: "Number of records on this page" },
    {
      key: "raw",
      type: "object",
      label: "The body, when CleverReach did not answer with an array",
    },
  ],

  async execute(input, ctx) {
    const start = unixTime(input.start, "start");
    const end = unixTime(input.end, "end");
    if ((start === undefined) !== (end === undefined)) {
      throw new Error("`start` and `end` must be given together");
    }
    return asList(
      await new CleverReachClient(ctx).request("/reports", {
        query: {
          pagesize: optInt(input.pageSize, "pageSize", 1, Number.MAX_SAFE_INTEGER),
          page: optInt(input.page, "page", 0, 10000),
          channel_id: optString(input.channelId),
          start,
          end,
          group_id: optString(input.groupId),
          mode: optEnum(input.mode, "mode", ["full", "basic"] as const),
        },
      }),
    );
  },
};

export default action;
