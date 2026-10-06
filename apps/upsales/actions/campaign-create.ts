import type { ActionDefinition } from "@w6w/types";
import { bit, buildBody, refs, UpsalesClient } from "../lib/client.ts";
import { fieldsParam } from "../lib/params.ts";

/**
 * `POST /api/v2/projects` — Create a campaign.
 */
interface Input {
  name: string;
  startDate?: string;
  endDate?: string;
  active?: boolean;
  notes?: string;
  userIds?: string;
  fields?: unknown;
}

const campaignCreate: ActionDefinition<Input> = {
  key: "campaign-create",
  type: "perform",
  resource: "campaign",
  title: "Create Campaign",
  description: "Create a campaign.",
  idempotent: false,
  params: [
    {
      "key": "name",
      "label": "Name",
      "type": "string",
      "required": true,
    },
    {
      "key": "startDate",
      "label": "Start date",
      "type": "string",
      "hint": "Date as YYYY-MM-DD.",
    },
    {
      "key": "endDate",
      "label": "End date",
      "type": "string",
      "hint": "Date as YYYY-MM-DD.",
    },
    {
      "key": "active",
      "label": "Active",
      "type": "boolean",
    },
    {
      "key": "notes",
      "label": "Notes",
      "type": "text",
    },
    {
      "key": "userIds",
      "label": "User IDs",
      "type": "string",
      "hint": "Comma-separated Upsales user IDs, e.g. `1,2`.",
    },
    fieldsParam,
  ],
  output: [{ key: "data", type: "object", label: "The created campaign" }],

  async execute(input, ctx) {
    const body = buildBody(input.fields, {
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      active: bit(input.active),
      notes: input.notes,
      users: refs(input.userIds),
    });
    const data = await new UpsalesClient(ctx).data("POST", "/projects", { body });
    return { data };
  },
};

export default campaignCreate;
