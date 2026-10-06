import type { ActionDefinition } from "@w6w/types";
import { asList, CleverReachClient, optEnum, optInt, optString, unixTime } from "../lib/client.ts";

const STATES = ["all", "finished", "draft", "waiting", "running", "automation"] as const;

const action: ActionDefinition = {
  key: "mailing-list",
  type: "search",
  resource: "mailing",
  title: "List mailings",
  description:
    "List mailings (`GET /v3/mailings`). `start`/`end` filter by a time that depends on `state`: finished by finish time, draft by creation time, waiting by send time, running by start time. `page` only applies when `state` is not `all`.",
  params: [
    {
      key: "state",
      label: "State",
      type: "select",
      options: [
        { value: "all", label: "All" },
        { value: "finished", label: "Finished" },
        { value: "draft", label: "Draft" },
        { value: "waiting", label: "Waiting" },
        { value: "running", label: "Running" },
        { value: "automation", label: "Automation" },
      ],
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Vendor default 25; max 1000, or 100 when state is not `all`.",
      validation: { integer: true, min: 1, max: 1000 },
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "Zero-based; only when state is not `all`.",
      validation: { integer: true, min: 0 },
    },
    { key: "channelId", label: "Channel ID", type: "string" },
    { key: "start", label: "Start", type: "string", hint: "Unix timestamp or ISO 8601." },
    { key: "end", label: "End", type: "string", hint: "Unix timestamp or ISO 8601." },
    {
      key: "omitBody",
      label: "Omit bodies",
      type: "boolean",
      hint: "Skip loading body_html and body_text (the fields stay present but empty).",
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
    const state = optEnum(input.state, "state", STATES);
    const limit = optInt(input.limit, "limit", 1, 1000);
    if (limit !== undefined && limit > 100 && state !== undefined && state !== "all") {
      throw new Error("`limit` is at most 100 when `state` is not `all`");
    }
    return asList(
      await new CleverReachClient(ctx).request("/mailings", {
        query: {
          limit,
          state,
          channel_id: optString(input.channelId),
          start: unixTime(input.start, "start"),
          end: unixTime(input.end, "end"),
          page: optInt(input.page, "page", 0, Number.MAX_SAFE_INTEGER),
          omit_body: input.omitBody === undefined ? undefined : Boolean(input.omitBody),
        },
      }),
    );
  },
};

export default action;
