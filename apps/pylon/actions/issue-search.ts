import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, PylonClient } from "../lib/client.ts";
import { cursorParam, filterParam, PAGE_OUTPUT, searchTextParam } from "../lib/params.ts";

interface Input {
  filter?: unknown;
  searchText?: string;
  cursor?: string;
  limit?: number;
}

const FIELDS =
  "created_at, account_id, customer_portal_visible, ticket_form_id, requester_id, follower_user_id, " +
  "follower_contact_id, state, tags, title, body_html, assignee_id, team_id, issue_type, " +
  "issue_is_issue_group, resolved_at, latest_message_activity_at, updated_at, slack_channel_id, " +
  "workspace_email, reopened, or a custom field slug";

/** `POST /issues/search` — page size defaults to 100, "greater than 0 and less than 1000". */
const issueSearch: ActionDefinition<Input> = {
  key: "issue-search",
  type: "search",
  resource: "issue",
  title: "Search Issues",
  description:
    "Search issues by a filter tree and/or fuzzy text, one cursor page at a time. Unlike List Issues it needs no time range.",
  params: [
    filterParam(FIELDS),
    searchTextParam,
    cursorParam,
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Defaults to 100. Must be greater than 0 and less than 1000.",
      validation: { min: 1, max: 999, integer: true },
    },
  ],
  output: [{ key: "issues", type: "array", label: "Issues on this page" }, ...PAGE_OUTPUT],

  async execute(input, ctx) {
    const { items, ...page } = await new PylonClient(ctx).list("POST", "/issues/search", {
      body: compact({
        filter: jsonValue(input.filter),
        search_text: input.searchText,
        cursor: input.cursor,
        limit: input.limit,
      }),
    });
    return { issues: items, ...page };
  },
};

export default issueSearch;
