import type { ActionDefinition } from "@w6w/types";
import { type ListInput, listRecords } from "../lib/records.ts";
import { cursorParams, listFields, listOutput, pageParams, sortParams } from "../lib/params.ts";

const DEFAULT_FIELDS =
  "id,Deal_Name,Sub_Pipeline,Stage,Amount,Closing_Date,Account_Name,Contact_Name,Owner";

const pipelineList: ActionDefinition<ListInput> = {
  key: "pipeline-list",
  type: "read",
  resource: "pipeline",
  title: "List Pipelines",
  description:
    "List records in Bigin's Pipelines module. `fields` is required by the API (max 50 names).",
  params: [listFields(DEFAULT_FIELDS), ...pageParams, ...sortParams, ...cursorParams],
  output: listOutput,

  execute(input, ctx) {
    return listRecords(ctx, "Pipelines", input);
  },
};

export default pipelineList;
