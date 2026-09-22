import type { ActionDefinition } from "@w6w/types";
import type { BiginRecordResult } from "../lib/client.ts";
import { type UpdateInput, updateRecord } from "../lib/records.ts";
import { dataFields, recordId, writeOutput } from "../lib/params.ts";

const taskUpdate: ActionDefinition<UpdateInput, BiginRecordResult> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Update a Task's fields in Bigin's Tasks module.",
  idempotent: true,
  params: [
    recordId,
    { ...dataFields, hint: 'Only the fields to change, e.g. { "Phone": "+1 555 0100" }.' },
  ],
  output: writeOutput,

  execute(input, ctx) {
    return updateRecord(ctx, "Tasks", input);
  },
};

export default taskUpdate;
