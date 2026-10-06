import type { ActionDefinition } from "@w6w/types";
import { seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  projectId: string;
}

/** `POST /projects/{projectId}/complete` */
const projectComplete: ActionDefinition<Input> = {
  key: "project-complete",
  type: "perform",
  resource: "project",
  title: "Complete Project",
  description: "Mark a project completed.",
  idempotent: true,
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
      "POST",
      `/projects/${seg(input.projectId)}/complete`,
    );
    return { item: res.item ?? null };
  },
};

export default projectComplete;
