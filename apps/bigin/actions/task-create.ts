import type { ActionDefinition } from "@w6w/types";
import type { BiginRecordResult } from "../lib/client.ts";
import { type CreateInput, createRecord } from "../lib/records.ts";
import { dataFields, writeOutput } from "../lib/params.ts";

const taskCreate: ActionDefinition<CreateInput, BiginRecordResult> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description:
    'Create a Task in Bigin\'s Tasks module. `Subject` is the only system-mandatory field, e.g. { "Subject": "Call the lead", "Due_Date": "2026-10-01" }.',
  idempotent: false,
  params: [dataFields],
  output: writeOutput,

  execute(input, ctx) {
    return createRecord(ctx, "Tasks", input);
  },
};

export default taskCreate;
