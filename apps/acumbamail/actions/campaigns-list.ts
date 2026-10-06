import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";

interface Input {
  complete_json?: boolean;
  start_date?: string;
  end_date?: string;
  date_field?: string;
  status?: string;
}

/** `POST /api/1/getCampaigns/` */
const campaignsList: ActionDefinition<Input> = {
  key: "campaigns-list",
  type: "search",
  title: "List Campaigns",
  description:
    "Names and IDs of campaigns, optionally filtered by date range and status (limit: 10 requests per minute).",
  params: [
    {
      key: "complete_json",
      label: "Complete JSON",
      type: "boolean",
      hint: "Return the complete format.",
    },
    {
      key: "start_date",
      label: "Start date",
      type: "string",
      hint: "Per the reference, YYYY-MM-DD.",
    },
    {
      key: "end_date",
      label: "End date",
      type: "string",
      hint:
        "The reference documents this one as dd/mm/YYYY HH:MM (it differs from Start date); passed through as typed.",
    },
    {
      key: "date_field",
      label: "Date field",
      type: "string",
      hint: "created (default) or sent: which date the range applies to.",
    },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint:
        "Editing, Scheduled, Sent, Autoresponder-active, Autoresponder-paused, TestAB-in-progress, Automation, or 1-7.",
    },
  ],
  output: [{ key: "result", type: "object", label: "Parsed vendor response" }],

  async execute(input, ctx) {
    const result = await call(ctx, "getCampaigns", {
      complete_json: input.complete_json,
      start_date: input.start_date,
      end_date: input.end_date,
      date_field: input.date_field,
      status: input.status,
    });
    return { result };
  },
};

export default campaignsList;
