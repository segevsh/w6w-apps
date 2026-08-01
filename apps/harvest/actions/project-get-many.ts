import type { ActionDefinition } from "@w6w/types";
import { HarvestClient } from "../lib/client.ts";

interface Input {
  isActive?: boolean;
  clientId?: string;
  updatedSince?: string;
  perPage?: number;
}

/** GET /projects — list projects, optionally filtered. */
const projectGetMany: ActionDefinition<Input> = {
  key: "project-get-many",
  type: "read",
  resource: "project",
  title: "Get Many Projects",
  description: "List projects, optionally filtered by active status, client, or update time.",
  params: [
    { key: "isActive", label: "Is active", type: "boolean" },
    { key: "clientId", label: "Client ID", type: "string" },
    { key: "updatedSince", label: "Updated since", type: "datetime" },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      hint: "1–2000. Defaults to Harvest's own default (2000).",
    },
  ],
  output: [
    { key: "projects", type: "array", label: "Projects" },
    { key: "total_entries", type: "number", label: "Total entries" },
  ],

  execute(input, ctx) {
    const client = new HarvestClient(ctx);
    return client.request("/projects", {
      query: {
        is_active: input.isActive,
        client_id: input.clientId,
        updated_since: input.updatedSince,
        per_page: input.perPage,
      },
    });
  },
};

export default projectGetMany;
