import type { ActionDefinition } from "@w6w/types";
import { PylonClient } from "../lib/client.ts";

/** `GET /issue-statuses` — rate limit 30 requests per minute. */
const issueStatusList: ActionDefinition<Record<string, never>> = {
  key: "issue-status-list",
  type: "read",
  resource: "issue",
  title: "List Issue Statuses",
  description:
    "List the organization's issue statuses, including custom ones. A status `slug` is a valid `state` for Update Issue.",
  params: [],
  output: [
    { key: "statuses", type: "array", label: "Statuses (slug, label, category, is_archived)" },
    { key: "hasNextPage", type: "boolean", label: "Whether more results remain" },
  ],

  async execute(_input, ctx) {
    const { items, hasNextPage } = await new PylonClient(ctx).list("GET", "/issue-statuses");
    return { statuses: items, hasNextPage };
  },
};

export default issueStatusList;
