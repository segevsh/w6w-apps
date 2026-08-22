import type { ActionDefinition } from "@w6w/types";
import { csv, query, VantaClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/controls` — the requirements a framework imposes, and who owns them.
 *
 * A **control** is the framework's language — "access to production is
 * reviewed quarterly" — and a **test** is the automated evidence for it. One
 * control is usually satisfied by several tests and several documents, which is
 * why a failing test matters more or less depending on what it hangs off.
 *
 * ## The owner is the field that makes this useful
 *
 * A control with no owner is a requirement nobody is accountable for, and it is
 * the most common finding in a compliance readiness review. Listing controls
 * and filtering to the unowned ones is a two-minute report that is otherwise a
 * morning of clicking, so this action separates them out.
 *
 * `frameworkMatchesAny` narrows to the framework being certified, since a
 * tenant tracking SOC 2 and ISO 27001 has overlapping but different controls.
 */
const action: ActionDefinition = {
  key: "control-list",
  type: "read",
  resource: "control",
  title: "List controls",
  description:
    "The requirements a framework imposes. A control with no owner is a requirement nobody is " +
    "accountable for — the most common finding in a readiness review, so they are listed apart.",
  params: [
    {
      key: "frameworks",
      label: "Frameworks",
      type: "string",
      default: "",
      hint: "Comma-separated framework ids from `framework-list`.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "controls", type: "array", label: "Controls" },
    { key: "count", type: "number", label: "Controls returned" },
    { key: "unowned", type: "array", label: "Controls with nobody accountable" },
    { key: "hasNextPage", type: "boolean", label: "True when the walk stopped early" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new VantaClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));

    const page = await client.pageAll<{ id?: string; name?: string; owner?: unknown }>(
      "/controls",
      { query: query({ frameworkMatchesAny: csv(p.frameworks) }) },
      want,
      Math.max(1, Number(p.maxPages ?? 50)),
    );

    const unowned = page.items
      .filter((c) => c?.owner === null || c?.owner === undefined)
      .map((c) => String(c?.name ?? c?.id ?? ""));

    return {
      controls: page.items,
      count: page.items.length,
      unowned,
      hasNextPage: page.hasNextPage,
    };
  },
};

export default action;
