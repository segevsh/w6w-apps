import type { ActionDefinition } from "@w6w/types";
import { encodeId, RendexClient } from "../lib/client.ts";
import { WATCH_OUTPUT } from "../lib/watch.ts";

/** `GET /v1/watches/{id}` — one watch (404 WATCH_NOT_FOUND if not owned by the account). */
interface Input {
  watchId: string;
}

const watchGet: ActionDefinition<Input> = {
  key: "watch-get",
  type: "read",
  resource: "watch",
  title: "Get Watch",
  description: "Read one watch's configuration and state.",
  params: [{ key: "watchId", label: "Watch ID", type: "string", required: true }],
  output: [...WATCH_OUTPUT],

  execute(input, ctx) {
    const id = encodeId(input.watchId);
    if (!id) throw new Error("Watch ID is required");
    return new RendexClient(ctx).json(`/watches/${id}`);
  },
};

export default watchGet;
