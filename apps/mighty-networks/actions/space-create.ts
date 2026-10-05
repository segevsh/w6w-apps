import type { ActionDefinition } from "@w6w/types";
import { compact, MightyClient } from "../lib/client.ts";

/** `POST /spaces` under `/admin/v1/networks/{network_id}` — the Network comes from the Connection. */
interface Input {
  name: string;
}

const spaceCreate: ActionDefinition<Input> = {
  key: "space-create",
  type: "perform",
  resource: "space",
  title: "Create Space",
  description: "Create a new space in the Network.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Space id" },
    { key: "name", type: "string", label: "Space name" },
    { key: "collection_id", type: "number", label: "Collection the space belongs to" },
    { key: "created_at", type: "string", label: "Created (ISO 8601)" },
    { key: "updated_at", type: "string", label: "Updated (ISO 8601)" },
  ],

  execute(input, ctx) {
    return new MightyClient(ctx).request("/spaces", {
      method: "POST",
      body: compact({ name: input.name }),
    });
  },
};

export default spaceCreate;
