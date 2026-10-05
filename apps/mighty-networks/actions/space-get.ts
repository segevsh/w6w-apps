import type { ActionDefinition } from "@w6w/types";
import { MightyClient, seg } from "../lib/client.ts";

/** `GET /spaces/{id}` under `/admin/v1/networks/{network_id}` — the Network comes from the Connection. */
interface Input {
  id: number;
}

const spaceGet: ActionDefinition<Input> = {
  key: "space-get",
  type: "read",
  resource: "space",
  title: "Get Space",
  description: "Fetch one space by id.",
  params: [
    {
      key: "id",
      label: "Space ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "id", type: "number", label: "Space id" },
    { key: "name", type: "string", label: "Space name" },
    { key: "collection_id", type: "number", label: "Collection the space belongs to" },
    { key: "created_at", type: "string", label: "Created (ISO 8601)" },
    { key: "updated_at", type: "string", label: "Updated (ISO 8601)" },
  ],

  execute(input, ctx) {
    return new MightyClient(ctx).request(`/spaces/${seg(input.id)}`);
  },
};

export default spaceGet;
