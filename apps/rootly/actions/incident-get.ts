import type { ActionDefinition } from "@w6w/types";
import { itemResult, RootlyClient, seg, strList } from "../lib/client.ts";

interface Input {
  id: string;
  include?: string[] | string;
}

/** `GET /v1/incidents/{id}` */
const incidentGet: ActionDefinition<Input> = {
  key: "incident-get",
  type: "read",
  resource: "incident",
  title: "Get Incident",
  description: "Fetch one incident by its ID, optionally with related records side-loaded.",
  params: [
    {
      key: "id",
      label: "Incident ID",
      type: "string",
      required: true,
      hint: "The incident UUID, as returned by List Incidents.",
    },
    {
      key: "include",
      label: "Include",
      type: "array",
      item: { type: "string" },
      hint:
        "Related records to side-load into `included`, comma-separated: sub_statuses, causes, subscribers, roles, slack_messages, environments, incident_types, services, functionalities, groups, events, action_items, custom_field_selections, feedbacks, incident_post_mortem, alerts.",
    },
  ],
  output: [
    {
      key: "item",
      type: "object",
      label: "The record, flattened to its attributes plus `id` and `type`",
    },
    { key: "included", type: "array", label: "Side-loaded related records (same flattened shape)" },
  ],

  async execute(input, ctx) {
    const res = await new RootlyClient(ctx).request("GET", `/v1/incidents/${seg(input.id)}`, {
      query: {
        "include": strList(input.include)?.join(","),
      },
    });
    return itemResult(res);
  },
};

export default incidentGet;
