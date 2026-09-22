import type { ActionDefinition } from "@w6w/types";
import type { BiginRecordResult } from "../lib/client.ts";
import { type CreateInput, createRecord } from "../lib/records.ts";
import { dataFields, writeOutput } from "../lib/params.ts";

const pipelineCreate: ActionDefinition<CreateInput, BiginRecordResult> = {
  key: "pipeline-create",
  type: "perform",
  resource: "pipeline",
  title: "Create Pipeline",
  description:
    'Create a Pipeline in Bigin\'s Pipelines module. `Deal_Name`, `Sub_Pipeline` and `Stage` are mandatory, e.g. { "Deal_Name": "Renewal", "Sub_Pipeline": "Sales Pipeline Standard", "Stage": "Qualification" }.',
  idempotent: false,
  params: [dataFields],
  output: writeOutput,

  execute(input, ctx) {
    return createRecord(ctx, "Pipelines", input);
  },
};

export default pipelineCreate;
