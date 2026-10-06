import type { ActionDefinition } from "@w6w/types";
import { TaskadeClient } from "../lib/client.ts";

interface Input {
  folderId: string;
  templateId: string;
}

/** `POST /projects/from-template` */
const projectCreateFromTemplate: ActionDefinition<Input> = {
  key: "project-create-from-template",
  type: "perform",
  resource: "project",
  title: "Create Project From Template",
  description: "Create a project in a folder from a project template.",
  idempotent: false,
  params: [{
    "key": "folderId",
    "label": "Folder ID",
    "type": "string",
    "required": true,
    "hint": "A folder (subspace) id from List Folders.",
  }, {
    "key": "templateId",
    "label": "Template ID",
    "type": "string",
    "required": true,
    "hint": "An id from List Folder Project Templates.",
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
      `/projects/from-template`,
      { body: { folderId: input.folderId, templateId: input.templateId } },
    );
    return { item: res.item ?? null };
  },
};

export default projectCreateFromTemplate;
