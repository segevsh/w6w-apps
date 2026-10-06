import type { ActionDefinition } from "@w6w/types";
import { bit, buildBody, encodeId, refs, UpsalesClient } from "../lib/client.ts";
import { fieldsParam, idParam } from "../lib/params.ts";

/**
 * `PUT /api/v2/projects/{id}` — Update a campaign.
 */
interface Input {
  id: number;
  name?: string;
  startDate?: string;
  endDate?: string;
  active?: boolean;
  notes?: string;
  userIds?: string;
  fields?: unknown;
}

const campaignUpdate: ActionDefinition<Input> = {
  key: "campaign-update",
  type: "perform",
  resource: "campaign",
  title: "Update Campaign",
  description: "Update a campaign.",
  idempotent: true,
  params: [
    idParam("id", "Campaign ID"),
    {
      "key": "name",
      "label": "Name",
      "type": "string",
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
  output: [{ key: "data", type: "object", label: "The updated campaign" }],

  async execute(input, ctx) {
    const body = buildBody(input.fields, {
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      active: bit(input.active),
      notes: input.notes,
      users: refs(input.userIds),
    });
    if (Object.keys(body).filter((k) => !([] as string[]).includes(k)).length === 0) {
      throw new Error("Nothing to update: provide at least one field.");
    }
    const data = await new UpsalesClient(ctx).data("PUT", `/projects/${encodeId(input.id)}`, {
      body,
    });
    return { data };
  },
};

export default campaignUpdate;
