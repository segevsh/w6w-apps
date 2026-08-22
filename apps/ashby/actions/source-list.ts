import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact } from "../lib/client.ts";

/**
 * `POST /source.list` — where candidates come from.
 *
 * A source is the value behind every sourcing report: inbound, referral, an
 * agency, a specific job board. `candidate-create` and `application-update`
 * both take a `sourceId`, and this is where the id comes from.
 *
 * The practical point: **create the source in Ashby first**. There is no
 * create-if-missing here, and a workflow that cannot find its source usually
 * ends up passing none — which produces a pipeline where the largest category
 * is "unattributed", and no amount of later analysis recovers it.
 *
 * Archived sources are excluded by default and still appear on historical
 * candidates.
 *
 * This endpoint is **not paginated**.
 */
const action: ActionDefinition = {
  key: "source-list",
  type: "read",
  resource: "source",
  title: "List sources",
  description:
    "Where candidates come from — the ids behind every sourcing report. Create the source in " +
    "Ashby first; a workflow that cannot find one usually sends none, and that is unrecoverable.",
  params: [
    {
      key: "includeArchived",
      label: "Include Archived",
      type: "boolean",
      default: false,
      hint: "Archived sources still appear on historical candidates.",
    },
  ],
  output: [
    { key: "sources", type: "array", label: "Sources" },
    { key: "count", type: "number", label: "Sources returned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const results = await new AshbyClient(ctx).request<unknown[]>("source.list", {
      body: compact({ includeArchived: p.includeArchived === true ? true : undefined }),
    });
    const sources = Array.isArray(results) ? results : [];
    return { sources, count: sources.length };
  },
};

export default action;
