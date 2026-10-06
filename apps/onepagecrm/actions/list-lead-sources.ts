import type { ActionDefinition } from "@w6w/types";
import { OnePageClient } from "../lib/client.ts";

/** `GET /lead_sources` — The account's lead sources in alphabetical order; each id is what contacts reference as lead_source_id. */
const listLeadSources: ActionDefinition<Record<string, never>> = {
  key: "list-lead-sources",
  type: "read",
  resource: "lead_source",
  title: "List Lead Sources",
  description:
    "The account's lead sources in alphabetical order; each id is what contacts reference as lead_source_id.",
  params: [],
  output: [{ key: "leadSources", type: "array", label: "Lead sources" }],

  async execute(_input, ctx) {
    const data = await new OnePageClient(ctx).data("/lead_sources");
    return { leadSources: Array.isArray(data) ? data : [] };
  },
};

export default listLeadSources;
