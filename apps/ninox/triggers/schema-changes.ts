import type { TriggerDefinition } from "@w6w/types";
import action from "../actions/schema-changes-list.ts";
import { pollChangeFeed } from "../lib/changes.ts";

const trigger: TriggerDefinition = {
  key: "schema-changes",
  title: "Schema Changed",
  description:
    "The run gets each module, table or field in the workspace that is created, updated, deleted or restored, oldest first.",
  output: [
    { key: "kind", type: "string", label: "Object kind (module, table, field)" },
    { key: "id", type: "string", label: "Object ID" },
    { key: "action", type: "string", label: "Action (created, updated, deleted, restored)" },
    { key: "changedAt", type: "string", label: "Changed at" },
  ],
  sample: { kind: "Table", id: "A", action: "created", changedAt: "2026-11-10T09:30:00Z" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return await pollChangeFeed(
      state,
      (q) =>
        action.execute({ since: q.since, asOf: q.asOf, limit: q.limit, offset: q.offset }, ctx),
    );
  },
};

export default trigger;
