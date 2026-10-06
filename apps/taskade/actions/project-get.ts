import type { ActionDefinition } from "@w6w/types";
import { seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  projectId: string;
}

/** `GET /projects/{projectId}` */
const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Read one project's id and name.",
  params: [{
    "key": "projectId",
    "label": "Project ID",
    "type": "string",
    "required": true,
    "hint": "A project id from List Folder Projects or List My Projects.",
  }],
  output: [
    {
      "key": "item",
      "type": "object",
      "label": "The resource Taskade returned",
    },
  ],

  async execute(input, ctx) {
    const res = await new TaskadeClient(ctx).request<Record<string, unknown>>(
      "GET",
      `/projects/${seg(input.projectId)}`,
    );
    return { item: res.item ?? null };
  },
};

export default projectGet;
