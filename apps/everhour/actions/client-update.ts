import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient, toList } from "../lib/client.ts";

/**
 * `PUT /clients/{clientId}` — Update a client's name, linked projects or business details.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  clientId: number;
  name: string;
  projects?: string[] | string;
  businessDetails?: string;
}

const clientUpdate: ActionDefinition<Input> = {
  key: "client-update",
  type: "perform",
  resource: "client",
  title: "Update Client",
  description: "Update a client's name, linked projects or business details.",
  idempotent: true,
  params: [
    {
      key: "clientId",
      label: "Client ID",
      type: "number",
      required: true,
      hint: "Numeric Everhour client id (from List Clients).",
    },
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
    return new EverhourClient(ctx).one(`/clients/${encodeId(input.clientId)}`, {
      method: "PUT",
      body: compact({
        name: input.name,
        projects: toList(input.projects),
        businessDetails: input.businessDetails,
      }),
    });
  },
};

export default clientUpdate;
