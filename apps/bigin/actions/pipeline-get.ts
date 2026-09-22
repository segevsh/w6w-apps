import type { ActionDefinition } from "@w6w/types";
import { type GetInput, getRecord } from "../lib/records.ts";
import { optionalFields, recordId } from "../lib/params.ts";

const pipelineGet: ActionDefinition<GetInput> = {
  key: "pipeline-get",
  type: "read",
  resource: "pipeline",
  title: "Get Pipeline",
  description: "Retrieve one Pipeline record by id from Bigin's Pipelines module.",
  params: [recordId, optionalFields],
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "Owner", type: "object", label: "Record owner" },
  ],

  execute(input, ctx) {
    return getRecord(ctx, "Pipelines", input);
  },
};

export default pipelineGet;
