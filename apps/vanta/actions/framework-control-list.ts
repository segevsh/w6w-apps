import type { ActionDefinition } from "@w6w/types";
import { VantaClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/frameworks/{frameworkId}/controls` — one framework's requirements.
 *
 * The difference from `control-list` with a framework filter is what a caller
 * has to know in advance: this takes the framework and returns its controls in
 * the framework's own structure, which is how a readiness report is organised —
 * by section, in the order an auditor will walk it.
 *
 * A control can belong to several frameworks, so the same requirement appears
 * under SOC 2 and ISO 27001 with different numbering. Reporting per framework
 * rather than per control is what keeps that legible.
 */
const action: ActionDefinition = {
  key: "framework-control-list",
  type: "read",
  resource: "framework",
  title: "List a framework's controls",
  description:
    "One framework's requirements in its own structure — how a readiness report is organised. " +
    "The same control appears under several frameworks with different numbering.",
  params: [
    { key: "frameworkId", label: "Framework ID", type: "string", required: true, default: "" },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "controls", type: "array", label: "Controls" },
    { key: "count", type: "number", label: "Controls returned" },
    { key: "hasNextPage", type: "boolean", label: "True when the walk stopped early" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const frameworkId = String(p.frameworkId ?? "").trim();
    if (!frameworkId) throw new Error("`frameworkId` is required");

    const client = new VantaClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));
    const page = await client.pageAll(
      `/frameworks/${encodeURIComponent(frameworkId)}/controls`,
      {},
      want,
      Math.max(1, Number(p.maxPages ?? 50)),
    );
    return { controls: page.items, count: page.items.length, hasNextPage: page.hasNextPage };
  },
};

export default action;
