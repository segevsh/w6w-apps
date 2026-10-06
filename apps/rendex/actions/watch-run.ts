import type { ActionDefinition } from "@w6w/types";
import { encodeId, RendexClient } from "../lib/client.ts";
import { WATCH_OUTPUT } from "../lib/watch.ts";

/**
 * `POST /v1/watches/{id}/run` — check now (1 credit; refunded on failure). A paused watch
 * answers 409 WATCH_PAUSED: resume it with `watch-update` first.
 */
interface Input {
  watchId: string;
}

const watchRun: ActionDefinition<Input> = {
  key: "watch-run",
  type: "perform",
  idempotent: false,
  resource: "watch-run",
  title: "Run Watch Now",
  description: "Run a change check immediately (1 credit). A paused watch must be resumed first.",
  params: [{ key: "watchId", label: "Watch ID", type: "string", required: true }],
  output: [...WATCH_OUTPUT],

  execute(input, ctx) {
    const id = encodeId(input.watchId);
    if (!id) throw new Error("Watch ID is required");
    return new RendexClient(ctx).json(`/watches/${id}/run`, { method: "POST" });
  },
};

export default watchRun;
