import integrationList from "../actions/integration-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /v1/integrations` through `integration-list`, snapshot-diffed. */
export default snapshotTrigger({
  key: "new-integration",
  title: "New Integration",
  description: "The run gets each integration newly connected to Vanta.",
  action: integrationList,
  listKey: "integrations",
  idKey: "integrationId",
  output: [
    { key: "integrationId", type: "string", label: "Integration ID" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "resourceKinds", type: "array", label: "Resource kinds" },
  ],
  sample: { integrationId: "aws", displayName: "AWS", resourceKinds: ["S3Bucket"] },
});
