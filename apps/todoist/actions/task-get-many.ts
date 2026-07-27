import type { ActionDefinition } from "@w6w/types";
import { TodoistClient } from "../lib/client.ts";

interface Input {
  projectId?: string;
  sectionId?: string;
  label?: string;
  filter?: string;
  lang?: string;
  ids?: string;
}

/**
 * GET /tasks — list active (incomplete) tasks. All filters are optional and
 * combine as a conjunction; `filter` is a Todoist filter query (e.g. `today`,
 * `#Work & @urgent`) and `ids` a comma-separated id list.
 */
const taskGetMany: ActionDefinition<Input> = {
  key: "task-get-many",
  type: "read",
  resource: "task",
  title: "Get Many Tasks",
  description: "List active tasks, optionally filtered by project, section, label, or query.",
  params: [
    { key: "projectId", label: "Project ID", type: "string" },
    { key: "sectionId", label: "Section ID", type: "string" },
    { key: "label", label: "Label", type: "string", hint: "Label name to filter by." },
    {
      key: "filter",
      label: "Filter query",
      type: "string",
      hint: "e.g. `today`, `#Work & @urgent`.",
    },
    {
      key: "lang",
      label: "Filter language",
      type: "string",
      hint: "2-letter code for parsing `filter`.",
    },
    { key: "ids", label: "Task IDs", type: "string", hint: "Comma-separated task ids." },
  ],
  output: [
    { key: "results", type: "array", label: "Tasks" },
  ],

  execute(input, ctx) {
    const client = new TodoistClient(ctx);
    return client.request("/tasks", {
      query: {
        project_id: input.projectId,
        section_id: input.sectionId,
        label: input.label,
        filter: input.filter,
        lang: input.lang,
        ids: input.ids,
      },
    });
  },
};

export default taskGetMany;
