import type { ActionDefinition } from "@w6w/types";
import { compact, EverhourClient, toList } from "../lib/client.ts";

/**
 * `POST /clients` — Create a client.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  name: string;
  projects?: string[] | string;
  businessDetails?: string;
}

const clientCreate: ActionDefinition<Input> = {
  key: "client-create",
  type: "perform",
  resource: "client",
  title: "Create Client",
  description: "Create a client.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, hint: "Client name." },
    {
      key: "projects",
      label: "Project IDs",
      type: "string",
      hint: "Comma-separated project ids to link to the client, e.g. `ev:123,as:456`.",
    },
    {
      key: "businessDetails",
      label: "Business details",
      type: "text",
      hint: "Free-text business details (address, tax id, ...).",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Client ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "projects", type: "array", label: "Project IDs" },
    { key: "budget", type: "object", label: "Budget" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/clients`, {
      method: "POST",
      body: compact({
        name: input.name,
        projects: toList(input.projects),
        businessDetails: input.businessDetails,
      }),
    });
  },
};

export default clientCreate;
