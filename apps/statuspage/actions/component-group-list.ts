import type { ActionDefinition } from "@w6w/types";
import { StatuspageClient } from "../lib/client.ts";
import { LIST_PARAMS, PAGE_PARAM } from "../lib/params.ts";

/**
 * `GET /pages/{page}/component_groups` — how the page is organised.
 *
 * Note the underscore: `component_groups`, not `component-groups`. Statuspage
 * mixes the two conventions across its API, and the wrong one 404s.
 *
 * A group's own status is **derived** from its members rather than settable, so
 * there is no "set group status" action here and there could not be — the way
 * to make a group go red is to make a component in it go red.
 */
const action: ActionDefinition = {
  key: "component-group-list",
  type: "read",
  resource: "component",
  title: "List component groups",
  description:
    "The page's component groups. A group's status is derived from its members, not set — so " +
    "changing a group means changing a component inside it.",
  params: [PAGE_PARAM, ...LIST_PARAMS],
  output: [
    { key: "groups", type: "array", label: "Component groups" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new StatuspageClient(ctx);
    const pageId = client.pageFor(p.pageId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    // Underscore, not hyphen.
    const groups = await client.requestAll(
      `/pages/${encodeURIComponent(pageId)}/component_groups`,
      {},
      returnAll ? Infinity : limit,
    );
    return { groups };
  },
};

export default action;
