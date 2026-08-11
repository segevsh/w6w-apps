import type { ActionDefinition } from "@w6w/types";
import { type ListResult, ProductboardClient } from "../lib/client.ts";
import { listOutput, pageCursorParam } from "../lib/params.ts";

/**
 * `GET /v2/plugin-integrations` — custom integrations that appear inside the
 * Productboard UI.
 *
 * A *plugin integration* is Productboard's extension point: it puts a push
 * button on an entity, and Productboard calls your endpoint when someone clicks
 * it. This app exposes the read half.
 *
 * Like a webhook subscription, the outbound `action.headers.authorization` is
 * **write-only** — the vendor's schema states it *"is write-only and never
 * returned in responses"* — so this read is safe to log.
 *
 * The write half (`POST`, `PATCH`, `DELETE`) is deliberately not exposed here:
 * creating one is a build-time act of registering an application, not a workflow
 * step, and getting `initialState`/`action` wrong on an `enabled` integration
 * makes Productboard send a live probe to whatever URL was supplied. See the
 * README for exactly what is and is not covered.
 */
interface Input {
  pageCursor?: string;
}

const pluginIntegrationList: ActionDefinition<Input, ListResult> = {
  key: "plugin-integration-list",
  type: "search",
  resource: "plugin-integration",
  title: "List plugin integrations",
  description:
    "List the custom plugin integrations registered in this workspace. The authorization header " +
    "each one sends is write-only and never returned.",
  params: [pageCursorParam],
  output: listOutput,

  execute(input, ctx) {
    return new ProductboardClient(ctx).list("/plugin-integrations", {
      query: { pageCursor: input.pageCursor },
    });
  },
};

export default pluginIntegrationList;
