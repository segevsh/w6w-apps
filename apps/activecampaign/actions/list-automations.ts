import type { ActionDefinition } from "@w6w/types";
import { ActiveCampaignClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: string;
}

/**
 * ActiveCampaign's automations are read-only via the API: "it is not
 * possible to create, edit, update, or delete automations via API"
 * (developers.activecampaign.com/reference/automation). Build and edit them
 * in the app; this app can only list, read, and enroll contacts.
 */
const listAutomations: ActionDefinition<Input> = {
  key: "list-automations",
  type: "search",
  resource: "automation",
  title: "List Automations",
  description: "List automations. Automations themselves are read-only via the API.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 20 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
    {
      key: "orderBy",
      label: "Order by",
      type: "select",
      options: [
        { value: "cdate", label: "Created" },
        { value: "mdate", label: "Last modified" },
      ],
      hint: "Optional. Leave empty to keep ActiveCampaign's default order.",
    },
    {
      key: "orderDirection",
      label: "Order direction",
      type: "select",
      options: [
        { value: "ASC", label: "Oldest first" },
        { value: "DESC", label: "Newest first" },
      ],
      default: "DESC",
      hint: "Used with Order by.",
    },
  ],
  output: [
    { key: "automations", type: "array", label: "Automations" },
    { key: "meta", type: "object", label: "Pagination meta" },
  ],

  execute(input, ctx) {
    return new ActiveCampaignClient(ctx).request("/automations", {
      query: {
        limit: input.limit,
        offset: input.offset,
        ...(input.orderBy
          ? { [`orders[${input.orderBy}]`]: input.orderDirection === "ASC" ? "ASC" : "DESC" }
          : {}),
      },
    });
  },
};

export default listAutomations;
