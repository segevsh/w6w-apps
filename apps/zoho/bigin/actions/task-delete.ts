import type { ActionDefinition } from "@w6w/types";
import type { BiginRecordResult } from "../lib/client.ts";
import { type DeleteInput, deleteRecord } from "../lib/records.ts";
import { recordId, writeOutput } from "../lib/params.ts";

const taskDelete: ActionDefinition<DeleteInput, BiginRecordResult> = {
  key: "task-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description:
    "Delete a Task from Bigin's Tasks module. Bigin moves the record to its Recycle Bin.",
  idempotent: true,
  params: [recordId],
  output: writeOutput,

  execute(input, ctx) {
    return deleteRecord(ctx, "Tasks", input);
  },
};

export default taskDelete;
