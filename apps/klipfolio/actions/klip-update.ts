import type { ActionDefinition } from "@w6w/types";
import { compact, KlipfolioClient, okResult, seg } from "../lib/client.ts";

interface Input {
  klip_id: string;
  name?: string;
  description?: string;
  client_id?: string;
}

/** `PUT /klips/{klip_id}`. */
const klipUpdate: ActionDefinition<Input> = {
  key: "klip-update",
  type: "perform",
  resource: "klip",
  title: "Update Klip",
  description: "Update a klip; only the fields you set are sent.",
  idempotent: true,
  params: [
    { key: "klip_id", label: "Klip ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "client_id",
      label: "Client ID",
      type: "string",
      hint: "Act on a client account instead of the company account. Partner accounts only.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "op", type: "string", label: "Operation echoed back, when the API reports one" },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request("PUT", `/klips/${seg(input.klip_id)}`, {
      query: { client_id: input.client_id },
      body: compact({ name: input.name, description: input.description }),
    });
    return okResult(env);
  },
};

export default klipUpdate;
