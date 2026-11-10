import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import backupList from "../actions/backup-list.ts";

// Snapshot of `GET /backups` read to the end (brief 9.1c): a project holds at most 1,000 serverless
// backups on the largest plan (https://docs.pinecone.io/reference/api/database-limits/object-limits).
// Added only: a backup changing status is not a new backup.
const list: ActionDefinition = backupList;

const trigger: TriggerDefinition = {
  key: "new-backup",
  title: "New Backup",
  description: "The run gets each backup newly created in the connected Pinecone project.",
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Backup ID" },
    {
      key: "values",
      type: "object",
      label: "Backup (backup_id, source_index_name, status, record_count)",
    },
  ],
  sample: {
    change: "added",
    key: "bk-2",
    values: {
      backup_id: "bk-2",
      source_index_name: "products",
      status: "Ready",
      record_count: 1200,
    },
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await list.execute({ returnAll: true }, ctx) as {
      data?: Array<{ backup_id?: unknown }>;
    };
    return await pollSnapshot({
      state,
      rows: (result.data ?? []).map((backup) => ({
        key: String(backup.backup_id ?? ""),
        values: backup,
      })),
      emit: { added: true, updated: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
