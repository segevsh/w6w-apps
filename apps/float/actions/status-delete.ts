import type { ActionDefinition } from "@w6w/types";
import { FloatClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `DELETE /v3/status/{status_id}` — delete a status. */
interface Input {
  status_id: number;
}

const statusDelete: ActionDefinition<Input> = {
  key: "status-delete",
  type: "perform",
  resource: "status",
  title: "Delete Status",
  description: "Delete a status.",
  idempotent: true,
  params: [idParam("status_id", "Status ID")],
  output: [],

  async execute(input, ctx) {
    await new FloatClient(ctx).remove(`/status/${input.status_id}`);
    return { deleted: true, status_id: input.status_id };
  },
};

export default statusDelete;
