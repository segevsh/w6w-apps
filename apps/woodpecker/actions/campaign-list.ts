import type { ActionDefinition } from "@w6w/types";
import { call, csv, listOf, V1 } from "../lib/client.ts";
import { str } from "../lib/params.ts";

type Input = {
  status?: string;
  id?: string;
};

const campaignList: ActionDefinition<Input> = {
  key: "campaign-list",
  type: "read",
  resource: "campaign",
  title: "List Campaigns",
  description:
    "List campaigns with basic info, optionally filtered by status or ID (legacy v1 endpoint).",
  params: [
    str("status", "Status", {
      hint: "Comma-separated: RUNNING, DRAFT, EDITED, PAUSED, STOPPED, COMPLETED.",
    }),
    str("id", "Campaign IDs", {
      hint: "Comma-separated campaign IDs. Prefer Get Campaign Statistics for one.",
    }),
  ],
  output: [
    {
      key: "campaigns",
      type: "array",
      label: "Campaigns: id, name, status, created, from_email, per_day, folder_name",
    },
    { key: "count", type: "number", label: "Campaigns returned" },
    { key: "message", type: "string", label: "Vendor message when nothing matches" },
  ],

  async execute(input, ctx) {
    const body = await call(ctx, "GET", V1, "/campaign_list", {
      query: { status: csv(input.status), id: csv(input.id) },
    });
    const { items, message } = listOf(body);
    return { campaigns: items, count: items.length, ...(message ? { message } : {}) };
  },
};

export default campaignList;
