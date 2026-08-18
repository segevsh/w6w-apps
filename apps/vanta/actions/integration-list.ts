import type { ActionDefinition } from "@w6w/types";
import { VantaClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/integrations` — what is feeding Vanta its evidence.
 *
 * Every automated test in Vanta is downstream of an integration: the cloud
 * account, the identity provider, the code host, the device-management tool.
 * When an integration disconnects — a rotated credential, a revoked OAuth grant
 * — **the tests it feeds do not fail. They go stale**, holding whatever they
 * last knew, and the dashboard stays green while the evidence rots.
 *
 * That makes this list the check worth running before trusting a compliance
 * report, and the one nobody thinks to run. The status page's
 * `3rd Party Integrations` component covers Vanta's side of the same problem;
 * this covers yours.
 */
const action: ActionDefinition = {
  key: "integration-list",
  type: "read",
  resource: "integration",
  title: "List connected integrations",
  description:
    "What feeds Vanta its evidence. A disconnected integration does not fail its tests — they " +
    "go stale and stay green, which is why this is worth checking before trusting a report.",
  params: [...LIST_PARAMS],
  output: [
    { key: "integrations", type: "array", label: "Connected integrations" },
    { key: "count", type: "number", label: "Integrations returned" },
    { key: "hasNextPage", type: "boolean", label: "True when the walk stopped early" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new VantaClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));
    const page = await client.pageAll(
      "/integrations",
      {},
      want,
      Math.max(1, Number(p.maxPages ?? 50)),
    );
    return {
      integrations: page.items,
      count: page.items.length,
      hasNextPage: page.hasNextPage,
    };
  },
};

export default action;
