import type { ActionDefinition } from "@w6w/types";
import { FloatClient, toCsv } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /v3/projects/{project_id}` — retrieve a single project. */
interface Input {
  project_id: number;
  expand?: string[] | string;
}

const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Retrieve a single project by ID.",
  params: [
    idParam("project_id", "Project ID"),
    {
      key: "expand",
      label: "Expand",
      type: "multiselect",
      advanced: true,
      options: [
        { value: "expenses", label: "Expenses" },
        { value: "phases", label: "Phases" },
        { value: "project_tasks", label: "Project tasks" },
        { value: "project_team", label: "Project team" },
        { value: "currency", label: "Currency" },
      ],
    },
  ],
  output: [
    { key: "project_id", type: "number", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    return await new FloatClient(ctx).json(`/projects/${input.project_id}`, {
      query: { expand: toCsv(input.expand) },
    });
  },
};

export default projectGet;
