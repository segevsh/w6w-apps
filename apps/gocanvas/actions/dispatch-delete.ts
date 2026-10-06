import type { ActionDefinition } from "@w6w/types";
import { deleted, encodeId, GoCanvasClient, hardDeleteQuery } from "../lib/client.ts";
import { hardDeleteParam, idParam } from "../lib/params.ts";

interface Input {
  dispatchId: number;
  hardDelete?: boolean;
}

const dispatchDelete: ActionDefinition<Input> = {
  key: "dispatch-delete",
  type: "perform",
  resource: "dispatch",
  title: "Delete Dispatch",
  description:
    "Soft-delete a dispatch (removed from mobile task lists, data kept), or permanently delete it.",
  idempotent: true,
  params: [
    idParam("dispatchId", "Dispatch ID"),
    hardDeleteParam,
  ],
  output: [
    { key: "data", type: "object", label: "The API's confirmation" },
  ],

  async execute(input, ctx) {
    return deleted(
      await new GoCanvasClient(ctx).request(`/dispatches/${encodeId(input.dispatchId)}`, {
        method: "DELETE",
        query: hardDeleteQuery(input.hardDelete),
      }),
    );
  },
};

export default dispatchDelete;
