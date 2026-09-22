import type { ActionDefinition } from "@w6w/types";
import { StreamtimeClient } from "../lib/client.ts";

/**
 * `POST /labels/search` — the labels on many entities at once.
 *
 * "Given a mapping of entity class names to arrays of IDs, returns labels for
 * all specified entities." The vendor's own example body is the whole
 * specification:
 *
 * ```json
 * { "Job": [101, 102], "Quote": [201], "User": [301, 302] }
 * ```
 *
 * The 200 is declared with **no content schema at all**, so the response body is
 * returned under a named field exactly as it arrives. The keys are entity class
 * names (`Job`, `Quote`, `User`, …) — the same vocabulary the vendor's sample
 * uses, and the only place it is documented.
 */
interface Input {
  entityIdsByType: Record<string, number[]>;
}

const labelsSearch: ActionDefinition<Input, { labels: unknown }> = {
  key: "labels-search",
  type: "search",
  resource: "label",
  title: "Search Labels",
  description:
    "Fetch labels for many entities at once, given a mapping of entity class names to ids.",
  params: [
    {
      key: "entityIdsByType",
      label: "Entities",
      type: "json",
      required: true,
      hint:
        'Mapping of entity class name to an array of ids, e.g. {"Job":[101,102],"Quote":[201],"' +
        'User":[301,302]} — the shape Streamtime documents by example.',
    },
  ],
  output: [
    {
      key: "labels",
      type: "object",
      label: "The response body — Streamtime documents no schema for it",
    },
  ],

  async execute(input, ctx) {
    if (typeof input.entityIdsByType !== "object" || input.entityIdsByType === null) {
      throw new Error("entityIdsByType must be an object mapping entity names to id arrays");
    }
    const labels = await new StreamtimeClient(ctx).request("/labels/search", {
      method: "POST",
      body: input.entityIdsByType,
    });
    return { labels: labels ?? null };
  },
};

export default labelsSearch;
