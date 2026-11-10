import type { ActionDefinition } from "@w6w/types";
import pluginIntegrationConnectionList from "../actions/plugin-integration-connection-list.ts";
import { listPages, snapshotTrigger } from "../lib/triggers.ts";

// `GET /v2/plugin-integrations/{id}/connections` for the integration the user picks: one integration's connections are read whole
// (brief 9.1c, 50-page cap). The row `id` is the Productboard entity id, so it is the stable key.
// Doc: https://developer.productboard.com/openapi/plugin-integrations.yaml
export default snapshotTrigger<{ integrationId: string }>({
  key: "new-plugin-integration-connection",
  title: "New Plugin Connection",
  description:
    "The run gets each Productboard entity newly connected through one plugin integration.",
  params: [
    {
      key: "integrationId",
      label: "Integration ID",
      type: "string",
      required: true,
      hint: "UUID from a List plugin integrations result.",
    },
  ],
  load: listPages<{ integrationId: string }>(
    pluginIntegrationConnectionList as unknown as ActionDefinition,
    (p) => ({ integrationId: p.integrationId }),
  ),
  rowKey: (c) => String(c.id ?? ""),
  output: [
    { key: "id", type: "string", label: "Entity ID" },
    { key: "fields", type: "object", label: "Fields (connection state)" },
  ],
  sample: {
    id: "ent-1",
    type: "pluginIntegrationConnection",
    fields: { connection: { state: "connected" } },
  },
});
