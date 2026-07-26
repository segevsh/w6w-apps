import type { ActionDefinition } from "@w6w/types";
import { ISSUE_FIELDS, LinearClient } from "../lib/client.ts";

interface Input {
  teamId?: string;
  assigneeId?: string;
  first?: number;
  after?: string;
}

/**
 * Linear paginates with Relay-style cursors: pass `pageInfo.endCursor` from one
 * page back as `after` to get the next.
 */
const QUERY = `
  query Issues($filter: IssueFilter, $first: Int, $after: String) {
    issues(filter: $filter, first: $first, after: $after) {
      nodes { ${ISSUE_FIELDS} }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const issueGetMany: ActionDefinition<Input> = {
  key: "issue-get-many",
  type: "search",
  resource: "issue",
  title: "List Issues",
  description: "List issues, optionally filtered by team or assignee. Uses cursor pagination.",
  params: [
    { key: "teamId", label: "Team ID", type: "string", row: "filter" },
    { key: "assigneeId", label: "Assignee ID", type: "string", row: "filter" },
    {
      key: "first",
      label: "Page size",
      type: "number",
      default: 50,
      validation: { min: 1, max: 250, integer: true },
      hint: "Linear caps this at 250.",
    },
    {
      key: "after",
      label: "After cursor",
      type: "string",
      advanced: true,
      hint: "`pageInfo.endCursor` from the previous page.",
    },
  ],
  output: [
    { key: "issues.nodes", type: "array", label: "Issues" },
    { key: "issues.pageInfo", type: "object", label: "Page info (hasNextPage, endCursor)" },
  ],

  execute(input, ctx) {
    // Linear's filter uses `{ field: { eq: value } }`; an empty filter object
    // is valid and returns everything visible to the connection.
    const filter: Record<string, unknown> = {};
    if (input.teamId) filter.team = { id: { eq: input.teamId } };
    if (input.assigneeId) filter.assignee = { id: { eq: input.assigneeId } };
    return new LinearClient(ctx).query(QUERY, {
      filter: Object.keys(filter).length ? filter : undefined,
      first: input.first ?? 50,
      after: input.after || undefined,
    });
  },
};

export default issueGetMany;
