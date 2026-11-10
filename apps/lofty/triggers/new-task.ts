import type { ActionDefinition } from "@w6w/types";
import { listSnapshot } from "../lib/triggers.ts";
import taskList from "../actions/task-list.ts";

/** No sort or since filter exists on this endpoint (Lofty OpenAPI, https://api.lofty.com/docs/), so the list is diffed by id. */
export default listSnapshot({
  key: "new-task",
  title: "New Task",
  description: "The run gets each new task on one lead: id, text, deadline and finished flag.",
  action: taskList as unknown as ActionDefinition,
  listKey: "taskList",
  idKey: "id",
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "number",
      required: true,
      hint: "The lead to watch, from List Leads or New Lead.",
    },
  ],
  input: (params) => ({ leadId: params.leadId }),
  output: [
    { key: "id", type: "number", label: "Task ID" },
    { key: "leadId", type: "number", label: "Lead ID" },
    { key: "content", type: "string", label: "Task text" },
    { key: "deadline", type: "string", label: "Deadline" },
    { key: "finishFlag", type: "boolean", label: "Finished" },
    { key: "createTime", type: "string", label: "Created at" },
  ],
  sample: {
    id: 9001,
    leadId: 651095960136641,
    content: "Call back about the showing",
    deadline: "2026-11-12 10:00:00",
    finishFlag: false,
    createTime: "2026-11-10 09:00:00",
  },
});
