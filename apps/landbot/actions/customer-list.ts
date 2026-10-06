import type { ActionDefinition } from "@w6w/types";
import { LandbotClient } from "../lib/client.ts";

/**
 * List Customers — List customers (conversations) in the workspace, filterable by channel, agent, archived and WhatsApp opt-in, with a name, email or phone search.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  channelId?: number;
  agentId?: number;
  searchBy?: string;
  search?: string;
  archived?: boolean;
  optIn?: boolean;
  offset?: number;
  limit?: number;
}

const customerList: ActionDefinition<Input> = {
  key: "customer-list",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description:
    "List customers (conversations) in the workspace, filterable by channel, agent, archived and WhatsApp opt-in, with a name, email or phone search.",
  params: [
    {
      "key": "channelId",
      "label": "Channel ID",
      "type": "number",
    },
    {
      "key": "agentId",
      "label": "Agent ID",
      "type": "number",
      "hint": "Only customers assigned to this agent.",
    },
    {
      "key": "searchBy",
      "label": "Search by",
      "type": "select",
      "hint": "Field `search` is matched against (default name).",
      "options": [
        {
          "value": "name",
          "label": "name",
        },
        {
          "value": "email",
          "label": "email",
        },
        {
          "value": "phone",
          "label": "phone",
        },
      ],
    },
    {
      "key": "search",
      "label": "Search",
      "type": "string",
    },
    {
      "key": "archived",
      "label": "Archived",
      "type": "boolean",
      "hint": "true = archived only.",
    },
    {
      "key": "optIn",
      "label": "WhatsApp opted in",
      "type": "boolean",
    },
    {
      "key": "offset",
      "label": "Offset",
      "type": "number",
      "hint": "Number of records to skip. Use nextOffset from the previous page.",
      "validation": {
        "min": 0,
        "integer": true,
      },
    },
    {
      "key": "limit",
      "label": "Limit",
      "type": "number",
      "hint": "Page size, 0-100 (default 20).",
      "validation": {
        "min": 0,
        "max": 100,
        "integer": true,
      },
    },
  ],
  output: [
    { key: "customers", type: "array", label: "Customers" },
    { key: "count", type: "number", label: "Items on this page" },
    { key: "total", type: "number", label: "Total matching records" },
    { key: "nextOffset", type: "number", label: "Offset of the next page, null on the last" },
  ],

  execute(input, ctx) {
    return new LandbotClient(ctx).list("/customers/", "customers", {
      query: {
        channel_id: input.channelId,
        agent_id: input.agentId,
        search_by: input.searchBy,
        search: input.search,
        archived: input.archived,
        opt_in: input.optIn,
        offset: input.offset,
        limit: input.limit,
      },
    });
  },
};

export default customerList;
