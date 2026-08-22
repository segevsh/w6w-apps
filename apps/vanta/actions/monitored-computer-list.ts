import type { ActionDefinition } from "@w6w/types";
import { csv, query, VantaClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/monitored-computers` — the laptops, and whether they are compliant.
 *
 * Device compliance is the control that generates the most day-to-day work in
 * any framework: disk encryption on, screen lock set, antivirus running, agent
 * actually reporting. It fails one person at a time and is fixed by asking that
 * person, which makes it the most automatable nudge in the whole program.
 *
 * ## The absent computer is the real finding
 *
 * A laptop that has stopped reporting is worse than one that reports a
 * failure: it has no state at all, and a report built by counting failures
 * misses it entirely. `complianceStatusFilterMatchesAny` is where that shows
 * up, and it is why filtering to failures alone gives a falsely reassuring
 * number.
 */
const action: ActionDefinition = {
  key: "monitored-computer-list",
  type: "read",
  resource: "computer",
  title: "List monitored computers",
  description:
    "Laptops and their compliance state. A machine that has stopped reporting has no state at " +
    "all — worse than a failure, and invisible in a report that counts only failures.",
  params: [
    {
      key: "complianceStatuses",
      label: "Compliance Statuses",
      type: "string",
      default: "",
      hint: "Comma-separated. Filtering to failures alone misses the machines that stopped " +
        "reporting.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "computers", type: "array", label: "Monitored computers" },
    { key: "count", type: "number", label: "Computers returned" },
    { key: "hasNextPage", type: "boolean", label: "True when the walk stopped early" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new VantaClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));

    const page = await client.pageAll(
      "/monitored-computers",
      {
        query: query({ complianceStatusFilterMatchesAny: csv(p.complianceStatuses) }),
      },
      want,
      Math.max(1, Number(p.maxPages ?? 50)),
    );

    ctx.log("info", "read Vanta monitored computers", { count: page.items.length });
    return { computers: page.items, count: page.items.length, hasNextPage: page.hasNextPage };
  },
};

export default action;
