import type { ActionDefinition } from "@w6w/types";
import { asRecords, MODULE_PARAM, NinoxClient, TABLE_PARAM } from "../lib/client.ts";

/**
 * `PATCH .../tables/{tableName}/records` — each entry carries a positive integer `id`. The
 * vendor makes the update transactional: one bad record rolls back all of them.
 */
interface Input {
  moduleName: string;
  tableName: string;
  records: Array<Record<string, unknown>> | string;
}

interface Output {
  updatedIds: string[];
}

const recordUpdate: ActionDefinition<Input, Output> = {
  key: "record-update",
  type: "perform",
  resource: "record",
  title: "Update Records",
  description: "Update existing records. Each entry must carry the record's `id` plus the fields " +
    "to change; the whole batch succeeds or none of it does. Set a field to null to clear it.",
  idempotent: true,
  params: [
    MODULE_PARAM,
    TABLE_PARAM,
    {
      key: "records",
      label: "Records",
      type: "json",
      required: true,
      hint: 'JSON array, each with an integer id, e.g. [{"id": 1, "name": "Ada"}]. Booleans must ' +
        "be true/false, multi fields an array of strings.",
    },
  ],
  output: [{ key: "updatedIds", type: "array", label: "Updated record ids" }],

  async execute(input, ctx) {
    const client = new NinoxClient(ctx);
    const records = asRecords(input.records);
    for (const r of records) {
      const id = Number(r.id);
      if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error("every entry of records needs a positive integer id");
      }
    }
    const data = await client.data<{ updatedIds?: string[] }>(
      `${client.tablePath(input)}/records`,
      { method: "PATCH", body: { records } },
    );
    return { updatedIds: data?.updatedIds ?? [] };
  },
};

export default recordUpdate;
