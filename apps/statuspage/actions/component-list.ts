import type { ActionDefinition } from "@w6w/types";
import { StatuspageClient } from "../lib/client.ts";
import { LIST_PARAMS, PAGE_PARAM } from "../lib/params.ts";

/**
 * `GET /pages/{page}/components` — the components and their current statuses.
 *
 * The lookup every write needs, since components are addressed by id and
 * remembered by name. It is also the cheapest way for a workflow to read the
 * page's current state before deciding whether anything needs changing — which
 * matters on an API allowing one request per second, where a needless write
 * costs as much as a useful one.
 *
 * `group_id` marks components that belong to a group, and `group: true` marks
 * the groups themselves — the same distinction the health checks in this pack
 * make when they skip group rows while reading somebody else's page.
 */
const action: ActionDefinition = {
  key: "component-list",
  type: "read",
  resource: "component",
  title: "List components",
  description:
    "Components with their ids and current statuses — the lookup every write needs, and the " +
    "cheap way to check whether a change is needed at all.",
  params: [PAGE_PARAM, ...LIST_PARAMS],
  output: [
    { key: "components", type: "array", label: "Components" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new StatuspageClient(ctx);
    const pageId = client.pageFor(p.pageId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    const components = await client.requestAll(
      `/pages/${encodeURIComponent(pageId)}/components`,
      {},
      returnAll ? Infinity : limit,
    );
    return { components };
  },
};

export default action;
