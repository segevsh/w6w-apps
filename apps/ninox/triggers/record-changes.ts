import type { TriggerDefinition } from "@w6w/types";
import action from "../actions/record-changes-list.ts";
import { pollChangeFeed } from "../lib/changes.ts";

interface Params {
  moduleName: string;
  tableName: string;
}

const trigger: TriggerDefinition<Params> = {
  key: "record-changes",
  title: "Record Changed",
  description:
    "The run gets each record of a table that is created, updated or deleted (id, change type, time), oldest first. The table must have history tracking enabled in Ninox.",
  params: [
    { key: "moduleName", label: "Module", type: "string", required: true },
    { key: "tableName", label: "Table", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "changeType", type: "string", label: "Change type (created, updated, deleted)" },
    { key: "changedAt", type: "string", label: "Changed at" },
  ],
  sample: { id: "17", changeType: "updated", changedAt: "2026-11-10T09:30:00Z" },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    return await pollChangeFeed(state, (q) =>
      action.execute({
        moduleName: params.moduleName,
        tableName: params.tableName,
        since: q.since,
        asOf: q.asOf,
        limit: q.limit,
        offset: q.offset,
      }, ctx));
  },
};

export default trigger;
