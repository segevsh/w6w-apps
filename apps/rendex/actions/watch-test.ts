import type { ActionDefinition } from "@w6w/types";
import { RendexClient } from "../lib/client.ts";
import { WATCH_OUTPUT, WATCH_PARAMS, watchBody, type WatchInput } from "../lib/watch.ts";

/**
 * `POST /v1/watches/test` — dry-run a watch config: renders the page and returns
 * reachability plus a screenshot. Costs 1 credit, refunded if the page is unreadable.
 * Assumed to take the create body (the docs give only "dry-run a config before creating it").
 */
const watchTest: ActionDefinition<WatchInput> = {
  key: "watch-test",
  type: "perform",
  idempotent: false,
  resource: "watch",
  title: "Test Watch Config",
  description: "Dry-run a watch config before creating it: render, reachability and a screenshot.",
  params: [{ key: "url", label: "URL", type: "string", required: true }, ...WATCH_PARAMS],
  output: [...WATCH_OUTPUT],

  execute(input, ctx) {
    if (!String(input.url ?? "").trim()) throw new Error("URL is required");
    return new RendexClient(ctx).json("/watches/test", { method: "POST", body: watchBody(input) });
  },
};

export default watchTest;
