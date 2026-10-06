import type { ActionDefinition } from "@w6w/types";
import { encodeId, RendexClient } from "../lib/client.ts";
import { WATCH_OUTPUT } from "../lib/watch.ts";

/**
 * `GET /v1/watches/{id}/runs` — run history, newest first. Each run reports `changed`,
 * `diffScore`, `diffPixels`, signed `beforeUrl`/`afterUrl`/`diffOverlayUrl`, `textDiff` and
 * `creditsCharged`. The docs describe no paging parameters.
 */
interface Input {
  watchId: string;
}

const watchRunsList: ActionDefinition<Input> = {
  key: "watch-runs-list",
  type: "search",
  resource: "watch-run",
  title: "List Watch Runs",
  description: "Read a watch's check history with change flags, diff scores and signed image URLs.",
  params: [{ key: "watchId", label: "Watch ID", type: "string", required: true }],
  output: [...WATCH_OUTPUT],

  execute(input, ctx) {
    const id = encodeId(input.watchId);
    if (!id) throw new Error("Watch ID is required");
    return new RendexClient(ctx).json(`/watches/${id}/runs`);
  },
};

export default watchRunsList;
