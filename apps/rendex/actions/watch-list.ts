import type { ActionDefinition } from "@w6w/types";
import { RendexClient } from "../lib/client.ts";
import { WATCH_OUTPUT } from "../lib/watch.ts";

/** `GET /v1/watches?status=active|paused|all` (default all). */
interface Input {
  status?: string;
}

const watchList: ActionDefinition<Input> = {
  key: "watch-list",
  type: "search",
  resource: "watch",
  title: "List Watches",
  description: "List your watches, optionally only active or only paused ones.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["all", "active", "paused"].map((v) => ({ value: v, label: v })),
      hint: "Default all.",
    },
  ],
  output: [...WATCH_OUTPUT],

  execute(input, ctx) {
    return new RendexClient(ctx).json("/watches", { query: { status: input.status } });
  },
};

export default watchList;
