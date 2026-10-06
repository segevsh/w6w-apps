import type { ActionDefinition } from "@w6w/types";
import { RendexClient } from "../lib/client.ts";
import { WATCH_OUTPUT, WATCH_PARAMS, watchBody, type WatchInput } from "../lib/watch.ts";

/**
 * `POST /v1/watches` — create a Rendex Watch (page-change monitor). Charges 1 credit for the
 * baseline capture unless created paused. `url` is the only required field. Text diffs cannot
 * use geo-targeting and PDF output cannot be visually diffed (both rejected at create time).
 */
const watchCreate: ActionDefinition<WatchInput> = {
  key: "watch-create",
  type: "perform",
  idempotent: false,
  resource: "watch",
  title: "Create Watch",
  description:
    "Monitor a URL for visual and text changes on a schedule (1 credit for the baseline).",
  params: [
    { key: "url", label: "URL", type: "string", required: true },
    {
      key: "paused",
      label: "Create paused",
      type: "boolean",
      hint: "A paused watch spends no credit.",
    },
    ...WATCH_PARAMS,
  ],
  output: [...WATCH_OUTPUT],

  execute(input, ctx) {
    if (!String(input.url ?? "").trim()) throw new Error("URL is required");
    return new RendexClient(ctx).json("/watches", { method: "POST", body: watchBody(input) });
  },
};

export default watchCreate;
