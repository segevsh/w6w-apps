import type { ActionDefinition } from "@w6w/types";
import { FloatClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /v3/clients/{client_id}` — retrieve a single client. */
interface Input {
  client_id: number;
}

const clientGet: ActionDefinition<Input> = {
  key: "client-get",
  type: "read",
  resource: "client",
  title: "Get Client",
  description: "Retrieve a single client by ID.",
  params: [idParam("client_id", "Client ID")],
  output: [
    { key: "client_id", type: "number", label: "Client ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    return await new FloatClient(ctx).json(`/clients/${input.client_id}`);
  },
};

export default clientGet;
