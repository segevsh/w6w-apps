import type { ActionDefinition } from "@w6w/types";
import type { BiginRecordResult } from "../lib/client.ts";
import { type DeleteInput, deleteRecord } from "../lib/records.ts";
import { recordId, writeOutput } from "../lib/params.ts";

const pipelineDelete: ActionDefinition<DeleteInput, BiginRecordResult> = {
  key: "pipeline-delete",
  type: "perform",
  resource: "pipeline",
  title: "Delete Pipeline",
  description:
    "Delete a Pipeline from Bigin's Pipelines module. Bigin moves the record to its Recycle Bin.",
  idempotent: true,
  params: [recordId],
  output: writeOutput,

  execute(input, ctx) {
    return deleteRecord(ctx, "Pipelines", input);
  },
};

export default pipelineDelete;
