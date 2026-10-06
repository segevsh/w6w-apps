import type { ActionDefinition } from "@w6w/types";
import { seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  workspaceId: string;
  contentType?: string;
  content: string;
}

/** `POST /workspaces/{workspaceId}/projects` */
const projectCreateInWorkspace: ActionDefinition<Input> = {
  key: "project-create-in-workspace",
  type: "perform",
  resource: "project",
  title: "Create Project in Workspace",
  description: "Create a project directly in a workspace from Markdown content.",
  idempotent: false,
  params: [{
    "key": "workspaceId",
    "label": "Workspace ID",
    "type": "string",
    "required": true,
    "hint": "From List Workspaces.",
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
      `/workspaces/${seg(input.workspaceId)}/projects`,
      { body: { contentType: input.contentType ?? "text/markdown", content: input.content } },
    );
    return { item: res.item ?? null };
  },
};

export default projectCreateInWorkspace;
