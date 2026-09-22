import type { ActionDefinition } from "@w6w/types";
import { type ListInput, listRecords } from "../lib/records.ts";
import { cursorParams, listFields, listOutput, pageParams, sortParams } from "../lib/params.ts";

const DEFAULT_FIELDS = "id,Subject,Due_Date,Status,Priority,Owner";

const taskList: ActionDefinition<ListInput> = {
  key: "task-list",
  type: "read",
  resource: "task",
  title: "List Tasks",
  description:
    "List records in Bigin's Tasks module. `fields` is required by the API (max 50 names).",
  params: [listFields(DEFAULT_FIELDS), ...pageParams, ...sortParams, ...cursorParams],
  output: listOutput,

  execute(input, ctx) {
    return listRecords(ctx, "Tasks", input);
  },
};

export default taskList;
