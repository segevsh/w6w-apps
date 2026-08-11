import type { ActionDefinition } from "@w6w/types";
import { type ListResult, ProductboardClient } from "../lib/client.ts";
import { listOutput, pageCursorParam } from "../lib/params.ts";

/**
 * `GET /v2/jira-integrations` — the Jira integrations configured here.
 *
 * The whole Jira surface in v2 is **read-only**: four operations, all `GET`
 * (list integrations, get one, list its connections, get one connection). There
 * is no create, no update and no delete — a Jira integration is configured in
 * the Productboard UI and only inspected through the API. Anyone planning to
 * provision one programmatically should find that out here rather than after
 * building the workflow.
 */
interface Input {
  pageCursor?: string;
}

const jiraIntegrationList: ActionDefinition<Input, ListResult> = {
  key: "jira-integration-list",
  type: "search",
  resource: "jira-integration",
  title: "List Jira integrations",
  description:
    "List the Jira integrations configured in this workspace. The v2 Jira surface is read-only — " +
    "integrations are created and edited in the Productboard UI.",
  params: [pageCursorParam],
  output: listOutput,

  execute(input, ctx) {
    return new ProductboardClient(ctx).list("/jira-integrations", {
      query: { pageCursor: input.pageCursor },
    });
  },
};

export default jiraIntegrationList;
