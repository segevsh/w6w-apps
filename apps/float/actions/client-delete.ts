import type { ActionDefinition } from "@w6w/types";
import { FloatClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `DELETE /v3/clients/{client_id}` — delete a client.
 *
 * Any project currently using this client has its `client_id` set to `null`
 * rather than being deleted itself.
 */
interface Input {
  client_id: number;
}

const clientDelete: ActionDefinition<Input> = {
  key: "client-delete",
  type: "perform",
  resource: "client",
  title: "Delete Client",
  description: "Delete a client. Projects using it keep their client_id cleared to null.",
  idempotent: true,
  params: [idParam("client_id", "Client ID")],
  output: [],

  async execute(input, ctx) {
    await new FloatClient(ctx).remove(`/clients/${input.client_id}`);
    return { deleted: true, client_id: input.client_id };
  },
};

export default clientDelete;
