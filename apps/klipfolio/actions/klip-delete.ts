import type { ActionDefinition } from "@w6w/types";
import { KlipfolioClient, okResult, seg } from "../lib/client.ts";

interface Input {
  klip_id: string;
  client_id?: string;
}

/** `DELETE /klips/{klip_id}`. */
const klipDelete: ActionDefinition<Input> = {
  key: "klip-delete",
  type: "perform",
  resource: "klip",
  title: "Delete Klip",
  description: "Permanently delete a klip.",
  idempotent: true,
  params: [
    { key: "klip_id", label: "Klip ID", type: "string", required: true },
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
    const env = await new KlipfolioClient(ctx).request("DELETE", `/klips/${seg(input.klip_id)}`, {
      query: { client_id: input.client_id },
    });
    return okResult(env);
  },
};

export default klipDelete;
