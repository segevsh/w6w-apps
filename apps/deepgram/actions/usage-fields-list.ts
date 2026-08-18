import type { ActionDefinition } from "@w6w/types";
import { DeepgramClient, isoDate, query } from "../lib/client.ts";

/**
 * `GET /v1/projects/{id}/usage/fields` — which models, tags and features were
 * actually used in a period.
 *
 * The lookup that makes the other two usable. Filtering usage by tag requires
 * knowing which tags exist, and they are not configured anywhere — a tag exists
 * because some request carried it. So this is where a cost report discovers the
 * dimensions it can group by, rather than guessing.
 *
 * It is also a quiet audit: a tag nobody recognises, or a model nobody meant to
 * enable, shows up here before it shows up on the invoice.
 */
const action: ActionDefinition = {
  key: "usage-fields-list",
  type: "read",
  resource: "usage",
  title: "List usage fields",
  description:
    "Which models, tags and features appeared in a period. Tags are not configured anywhere — " +
    "they exist because a request carried one — so this is where a report finds them.",
  params: [
    { key: "start", label: "From", type: "datetime", default: "" },
    { key: "end", label: "To", type: "datetime", default: "" },
  ],
  output: [
    { key: "tags", type: "array", label: "Tags seen — the dimensions you can group by" },
    { key: "models", type: "array", label: "Models used" },
    { key: "processing_methods", type: "array", label: "Processing methods" },
    { key: "features", type: "array", label: "Features used" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new DeepgramClient(ctx);

    return await client.request(
      `/v1/projects/${encodeURIComponent(client.projectId)}/usage/fields`,
      { query: query({ start: isoDate(p.start, "start"), end: isoDate(p.end, "end") }) },
    );
  },
};

export default action;
