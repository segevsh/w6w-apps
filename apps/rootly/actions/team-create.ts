import type { ActionDefinition } from "@w6w/types";
import { compact, intList, itemResult, jsonApiBody, RootlyClient, strList } from "../lib/client.ts";

interface Input {
  name: string;
  description?: string;
  public_description?: string;
  slug?: string;
  color?: string;
  notify_emails?: string[] | string;
  user_ids?: Array<number | string> | string;
  admin_ids?: Array<number | string> | string;
  alert_urgency_id?: string;
  external_id?: string;
  backstage_id?: string;
}

/** `POST /v1/teams` */
const teamCreate: ActionDefinition<Input> = {
  key: "team-create",
  type: "perform",
  resource: "team",
  title: "Create Team",
  description: "Create a team. The JSON:API type of a team is `groups`.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
    },
    {
      key: "description",
      label: "Description",
      type: "text",
    },
    {
      key: "public_description",
      label: "Public description",
      type: "text",
    },
    {
      key: "slug",
      label: "Slug",
      type: "string",
    },
    {
      key: "color",
      label: "Color",
      type: "string",
      hint: "Hex color.",
    },
    {
      key: "notify_emails",
      label: "Notify emails",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "user_ids",
      label: "Member user IDs",
      type: "array",
      item: { type: "number" },
      hint: "Integer Rootly user IDs.",
    },
    {
      key: "admin_ids",
      label: "Admin user IDs",
      type: "array",
      item: { type: "number" },
      hint: "Integer Rootly user IDs.",
    },
    {
      key: "alert_urgency_id",
      label: "Alert urgency ID",
      type: "string",
    },
    {
      key: "external_id",
      label: "External ID",
      type: "string",
    },
    {
      key: "backstage_id",
      label: "Backstage ID",
      type: "string",
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
    const res = await new RootlyClient(ctx).request("POST", "/v1/teams", {
      body: jsonApiBody(
        "groups",
        compact({
          name: input.name,
          description: input.description,
          public_description: input.public_description,
          slug: input.slug,
          color: input.color,
          notify_emails: strList(input.notify_emails),
          user_ids: intList(input.user_ids),
          admin_ids: intList(input.admin_ids),
          alert_urgency_id: input.alert_urgency_id,
          external_id: input.external_id,
          backstage_id: input.backstage_id,
        }),
      ),
    });
    return itemResult(res);
  },
};

export default teamCreate;
