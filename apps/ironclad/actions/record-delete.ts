import type { ActionDefinition } from "@w6w/types";
import { encodeId, IroncladClient } from "../lib/client.ts";
import { recordIdParam } from "../lib/params.ts";

interface Input {
  recordId: string;
}

const recordDelete: ActionDefinition<Input> = {
  key: "record-delete",
  type: "perform",
  resource: "record",
  title: "Delete Record",
  description: "Permanently delete a repository record.",
  idempotent: false,
  params: [recordIdParam],
  output: [{ key: "deleted", type: "boolean", label: "Whether the record was deleted" }, {
    key: "recordId",
    type: "string",
    label: "Record ID",
  }],

  async execute(input, ctx) {
    await new IroncladClient(ctx).json(`/records/${encodeId(input.recordId)}`, {
      method: "DELETE",
    });
    return { deleted: true, recordId: input.recordId };
  },
};

export default recordDelete;
