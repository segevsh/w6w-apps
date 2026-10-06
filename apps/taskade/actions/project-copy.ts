import type { ActionDefinition } from "@w6w/types";
import { compact, seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  projectId: string;
  folderId: string;
  projectTitle?: string;
}

/** `POST /projects/{projectId}/copy` */
const projectCopy: ActionDefinition<Input> = {
  key: "project-copy",
  type: "perform",
  resource: "project",
  title: "Copy Project",
  description: "Copy a project into a folder.",
  idempotent: false,
  params: [{
    "key": "projectId",
    "label": "Project ID",
    "type": "string",
    "required": true,
    "hint": "A project id from List Folder Projects or List My Projects.",
  }, {
    "key": "folderId",
    "label": "Folder ID",
    "type": "string",
    "required": true,
    "hint": "A folder (subspace) id from List Folders.",
  }, {
    "key": "projectTitle",
    "label": "New title",
    "type": "string",
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
      `/projects/${seg(input.projectId)}/copy`,
      { body: compact({ folderId: input.folderId, projectTitle: input.projectTitle }) },
    );
    return { item: res.item ?? null };
  },
};

export default projectCopy;
