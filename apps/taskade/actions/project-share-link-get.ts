import type { ActionDefinition } from "@w6w/types";
import { seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  projectId: string;
}

/** `GET /projects/{projectId}/shareLink` */
const projectShareLinkGet: ActionDefinition<Input> = {
  key: "project-share-link-get",
  type: "read",
  resource: "project",
  title: "Get Project Share Link",
  description: "Read a project's share link settings.",
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
      `/projects/${seg(input.projectId)}/shareLink`,
    );
    return { item: res.item ?? null };
  },
};

export default projectShareLinkGet;
