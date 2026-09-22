import type { ActionDefinition } from "@w6w/types";
import { type GetInput, getRecord } from "../lib/records.ts";
import { optionalFields, recordId } from "../lib/params.ts";

const taskGet: ActionDefinition<GetInput> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Retrieve one Task record by id from Bigin's Tasks module.",
  params: [recordId, optionalFields],
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "Owner", type: "object", label: "Record owner" },
  ],

  execute(input, ctx) {
    return getRecord(ctx, "Tasks", input);
  },
};

export default taskGet;
