import type { ActionDefinition } from "@w6w/types";
import { compact, intList, itemResult, jsonApiBody, RootlyClient, strList } from "../lib/client.ts";

interface Input {
  name: string;
  description?: string;
  public_description?: string;
  slug?: string;
  color?: string;
  notify_emails?: string[] | string;
  owner_group_ids?: string[] | string;
  owner_user_ids?: Array<number | string> | string;
  environment_ids?: string[] | string;
  service_ids?: string[] | string;
  alert_urgency_id?: string;
  escalation_policy_id?: string;
  external_id?: string;
  backstage_id?: string;
}

/** `POST /v1/services` */
const serviceCreate: ActionDefinition<Input> = {
  key: "service-create",
  type: "perform",
  resource: "service",
  title: "Create Service",
  description: "Add a service to the catalog.",
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
      hint: "Hex color, e.g. `#047BF8`.",
    },
    {
      key: "notify_emails",
      label: "Notify emails",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "owner_group_ids",
      label: "Owner team IDs",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "owner_user_ids",
      label: "Owner user IDs",
      type: "array",
      item: { type: "number" },
      hint: "Integer Rootly user IDs.",
    },
    {
      key: "environment_ids",
      label: "Environment IDs",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "service_ids",
      label: "Dependent service IDs",
      type: "array",
      item: { type: "string" },
      hint: "Services this one depends on.",
    },
    {
      key: "alert_urgency_id",
      label: "Alert urgency ID",
      type: "string",
    },
    {
      key: "escalation_policy_id",
      label: "Escalation policy ID",
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
    const res = await new RootlyClient(ctx).request("POST", "/v1/services", {
      body: jsonApiBody(
        "services",
        compact({
          name: input.name,
          description: input.description,
          public_description: input.public_description,
          slug: input.slug,
          color: input.color,
          notify_emails: strList(input.notify_emails),
          owner_group_ids: strList(input.owner_group_ids),
          owner_user_ids: intList(input.owner_user_ids),
          environment_ids: strList(input.environment_ids),
          service_ids: strList(input.service_ids),
          alert_urgency_id: input.alert_urgency_id,
          escalation_policy_id: input.escalation_policy_id,
          external_id: input.external_id,
          backstage_id: input.backstage_id,
        }),
      ),
    });
    return itemResult(res);
  },
};

export default serviceCreate;
