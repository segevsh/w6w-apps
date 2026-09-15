import type { ActionDefinition } from "@w6w/types";
import { FloatClient } from "../lib/client.ts";

/** `POST /v3/clients` — add a new client. */
interface Input {
  name: string;
}

const clientCreate: ActionDefinition<Input> = {
  key: "client-create",
  type: "perform",
  resource: "client",
  title: "Create Client",
  description: "Add a new client.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, validation: { maxLength: 200 } },
  ],
  output: [
    { key: "client_id", type: "number", label: "New client ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    return await new FloatClient(ctx).json("/clients", {
      method: "POST",
      body: { name: input.name },
    });
  },
};

export default clientCreate;
