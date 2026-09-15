import type { ActionDefinition } from "@w6w/types";
import { FloatClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `PATCH /v3/clients/{client_id}` — update a client's name. */
interface Input {
  client_id: number;
  name: string;
}

const clientUpdate: ActionDefinition<Input> = {
  key: "client-update",
  type: "perform",
  resource: "client",
  title: "Update Client",
  description: "Update a client's name.",
  idempotent: true,
  params: [
    idParam("client_id", "Client ID"),
    { key: "name", label: "Name", type: "string", required: true, validation: { maxLength: 200 } },
  ],
  output: [
    { key: "client_id", type: "number", label: "Client ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    return await new FloatClient(ctx).json(`/clients/${input.client_id}`, {
      method: "PATCH",
      body: { name: input.name },
    });
  },
};

export default clientUpdate;
