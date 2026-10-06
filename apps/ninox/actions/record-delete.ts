import type { ActionDefinition } from "@w6w/types";
import { asIds, MODULE_PARAM, NinoxClient, TABLE_PARAM } from "../lib/client.ts";

/** `DELETE .../tables/{tableName}/records` — body `{records: [ids]}`, all-or-nothing. */
interface Input {
  moduleName: string;
  tableName: string;
  recordIds: number[] | string;
}

interface Output {
  deletedIds: string[];
}

const recordDelete: ActionDefinition<Input, Output> = {
  key: "record-delete",
  type: "perform",
  resource: "record",
  title: "Delete Records",
  description: "Delete records by id in one transaction. If any id is invalid or missing, " +
    "nothing is deleted.",
  // A retry after success names ids that no longer exist, which the vendor rejects.
  idempotent: false,
  params: [
    MODULE_PARAM,
    TABLE_PARAM,
    {
      key: "recordIds",
      label: "Record IDs",
      type: "string",
      required: true,
      placeholder: "101, 102, 103",
      hint: "Comma-separated positive integer record ids.",
    },
  ],
  output: [{ key: "deletedIds", type: "array", label: "Deleted record ids" }],

  async execute(input, ctx) {
    const client = new NinoxClient(ctx);
    const data = await client.data<{ deletedIds?: string[] }>(
      `${client.tablePath(input)}/records`,
      { method: "DELETE", body: { records: asIds(input.recordIds) } },
    );
    return { deletedIds: data?.deletedIds ?? [] };
  },
};

export default recordDelete;
