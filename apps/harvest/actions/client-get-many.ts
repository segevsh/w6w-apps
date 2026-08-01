import type { ActionDefinition } from "@w6w/types";
import { HarvestClient } from "../lib/client.ts";

interface Input {
  isActive?: boolean;
  updatedSince?: string;
  perPage?: number;
}

/** GET /clients — list clients, optionally filtered. */
const clientGetMany: ActionDefinition<Input> = {
  key: "client-get-many",
  type: "read",
  resource: "client",
  title: "Get Many Clients",
  description: "List clients, optionally filtered by active status or update time.",
  params: [
    { key: "isActive", label: "Is active", type: "boolean" },
    { key: "updatedSince", label: "Updated since", type: "datetime" },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      hint: "1–2000. Defaults to Harvest's own default (2000).",
    },
  ],
  output: [
    { key: "clients", type: "array", label: "Clients" },
    { key: "total_entries", type: "number", label: "Total entries" },
  ],

  execute(input, ctx) {
    const client = new HarvestClient(ctx);
    return client.request("/clients", {
      query: {
        is_active: input.isActive,
        updated_since: input.updatedSince,
        per_page: input.perPage,
      },
    });
  },
};

export default clientGetMany;
