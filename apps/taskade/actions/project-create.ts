import type { ActionDefinition } from "@w6w/types";
import { TaskadeClient } from "../lib/client.ts";

interface Input {
  folderId: string;
  contentType?: string;
  content: string;
}

/** `POST /projects` */
const projectCreate: ActionDefinition<Input> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description:
    "Create a project in a folder from Markdown content (headings and lists become tasks).",
  idempotent: false,
  params: [{
    "key": "folderId",
    "label": "Folder ID",
    "type": "string",
    "required": true,
    "hint": "A folder (subspace) id from List Folders.",
  }, {
    "key": "contentType",
    "label": "Content type",
    "type": "select",
    "default": "text/markdown",
    "options": [
      {
        "value": "text/markdown",
        "label": "Markdown",
      },
    ],
  }, {
    "key": "content",
    "label": "Content",
    "type": "text",
    "required": true,
    "hint": "Markdown that becomes the project's outline.",
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
      `/projects`,
      {
        body: {
          folderId: input.folderId,
          contentType: input.contentType ?? "text/markdown",
          content: input.content,
        },
      },
    );
    return { item: res.item ?? null };
  },
};

export default projectCreate;
