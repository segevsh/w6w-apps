import type { ActionDefinition } from "@w6w/types";
import { encodeId, RendexClient } from "../lib/client.ts";
import { WATCH_OUTPUT } from "../lib/watch.ts";

/** `DELETE /v1/watches/{id}` — delete a watch and its run history. */
interface Input {
  watchId: string;
}

const watchDelete: ActionDefinition<Input> = {
  key: "watch-delete",
  type: "perform",
  idempotent: true,
  resource: "watch",
  title: "Delete Watch",
  description: "Delete a watch and its entire run history.",
  params: [{ key: "watchId", label: "Watch ID", type: "string", required: true }],
  output: [...WATCH_OUTPUT],

  execute(input, ctx) {
    const id = encodeId(input.watchId);
    if (!id) throw new Error("Watch ID is required");
    return new RendexClient(ctx).json(`/watches/${id}`, { method: "DELETE" });
  },
};

export default watchDelete;
