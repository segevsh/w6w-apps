import type { ActionDefinition } from "@w6w/types";
import type { BiginRecordResult } from "../lib/client.ts";
import { type UpdateInput, updateRecord } from "../lib/records.ts";
import { dataFields, recordId, writeOutput } from "../lib/params.ts";

const pipelineUpdate: ActionDefinition<UpdateInput, BiginRecordResult> = {
  key: "pipeline-update",
  type: "perform",
  resource: "pipeline",
  title: "Update Pipeline",
  description: "Update a Pipeline's fields in Bigin's Pipelines module.",
  idempotent: true,
  params: [
    recordId,
    { ...dataFields, hint: 'Only the fields to change, e.g. { "Phone": "+1 555 0100" }.' },
  ],
  output: writeOutput,

  execute(input, ctx) {
    return updateRecord(ctx, "Pipelines", input);
  },
};

export default pipelineUpdate;
