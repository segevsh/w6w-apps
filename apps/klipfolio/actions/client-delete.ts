import type { ActionDefinition } from "@w6w/types";
import { KlipfolioClient, okResult, seg } from "../lib/client.ts";

interface Input {
  client_id: string;
}

/** `DELETE /clients/{client_id}`. */
const clientDelete: ActionDefinition<Input> = {
  key: "client-delete",
  type: "perform",
  resource: "client",
  title: "Delete Client",
  description: "Permanently delete a client account.",
  idempotent: true,
  params: [
    { key: "client_id", label: "Client ID", type: "string", required: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "op", type: "string", label: "Operation echoed back, when the API reports one" },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request(
      "DELETE",
      `/clients/${seg(input.client_id)}`,
    );
    return okResult(env);
  },
};

export default clientDelete;
