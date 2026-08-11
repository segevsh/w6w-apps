import type { ActionDefinition } from "@w6w/types";
import { encodeId, type ListResult, ProductboardClient } from "../lib/client.ts";
import { listOutput, pageCursorParam } from "../lib/params.ts";

/**
 * `GET /v2/jira-integrations/{integrationId}/connections` — which Productboard
 * entity maps to which Jira issue.
 *
 * The reason to reach for the Jira surface at all: this is the mapping table
 * between the two systems, and it can be searched from either end —
 * `issueKey` (`API-100`) or `issueId` (Jira's numeric id). Given a Jira issue,
 * this answers "which feature is this?" without a second lookup.
 *
 * Still read-only. Creating a connection is a UI action.
 */
interface Input {
  integrationId: string;
  issueKey?: string;
  issueId?: string;
  pageCursor?: string;
}

const jiraIntegrationConnectionList: ActionDefinition<Input, ListResult> = {
  key: "jira-integration-connection-list",
  type: "search",
  resource: "jira-integration",
  title: "List Jira connections",
  description:
    "List the links between Productboard entities and Jira issues for one integration, " +
    "optionally narrowed to a single issue key or issue id.",
  params: [
    {
      key: "integrationId",
      label: "Integration ID",
      type: "string",
      required: true,
      hint: "UUID from a List Jira integrations result.",
    },
    {
      key: "issueKey",
      label: "Jira issue key",
      type: "string",
      placeholder: "API-100",
      hint: "The human-readable key. Use this to go from a Jira issue back to its Productboard " +
        "entity.",
    },
    {
      key: "issueId",
      label: "Jira issue ID",
      type: "string",
      hint: "Jira's internal numeric id, if that is what you hold instead of the key.",
    },
    pageCursorParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new ProductboardClient(ctx).list(
      `/jira-integrations/${encodeId(input.integrationId)}/connections`,
      {
        query: {
          issueKey: input.issueKey,
          issueId: input.issueId,
          pageCursor: input.pageCursor,
        },
      },
    );
  },
};

export default jiraIntegrationConnectionList;
