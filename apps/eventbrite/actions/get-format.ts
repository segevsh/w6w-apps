import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  formatId: string;
}

const action: ActionDefinition<Input> = {
  key: "get-format",
  type: "read",
  resource: "format",
  title: "Get Format",
  description: "Retrieve an event format by ID.",
  idempotent: true,
  params: [{ key: "formatId", label: "Format ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "name_localized", type: "string", label: "Localized name" },
    { key: "short_name", type: "string", label: "Short name" },
    { key: "short_name_localized", type: "string", label: "Localized short name" },
    { key: "resource_uri", type: "string", label: "Resource URI" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/formats/${encodeURIComponent(input.formatId)}/`);
  },
};

export default action;
