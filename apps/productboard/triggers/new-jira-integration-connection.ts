import type { ActionDefinition } from "@w6w/types";
import jiraIntegrationConnectionList from "../actions/jira-integration-connection-list.ts";
import { listPages, snapshotTrigger } from "../lib/triggers.ts";

// `GET /v2/jira-integrations/{id}/connections` for the integration the user picks: one integration's connections are read whole
// (brief 9.1c, 50-page cap). The row `id` is the Productboard entity id, so it is the stable key.
// Doc: https://developer.productboard.com/openapi/jira-integrations.yaml
export default snapshotTrigger<{ integrationId: string }>({
  key: "new-jira-integration-connection",
  title: "New Jira Connection",
  description:
    "The run gets each Productboard entity newly linked to a Jira issue in one integration.",
  params: [
    {
      key: "integrationId",
      label: "Integration ID",
      type: "string",
      required: true,
      hint: "UUID from a List Jira integrations result.",
    },
  ],
  load: listPages<{ integrationId: string }>(
    jiraIntegrationConnectionList as unknown as ActionDefinition,
    (p) => ({ integrationId: p.integrationId }),
  ),
  rowKey: (c) => String(c.id ?? ""),
  output: [
    { key: "id", type: "string", label: "Entity ID" },
    { key: "fields", type: "object", label: "Fields (issueKey, issueId)" },
  ],
  sample: {
    id: "ent-1",
    type: "jiraIntegrationConnection",
    fields: { issueKey: "PROJ-123", issueId: "10001" },
  },
});
