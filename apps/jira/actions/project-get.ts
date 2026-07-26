import type { ActionDefinition } from "@w6w/types";
import { JiraClient } from "../lib/client.ts";

const projectGet: ActionDefinition<{ projectKey: string }> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Fetch a project by key or id, including its issue types.",
  params: [
    {
      key: "projectKey",
      label: "Project key or ID",
      type: "string",
      required: true,
      placeholder: "ENG",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "key", type: "string", label: "Key" },
    { key: "name", type: "string", label: "Name" },
    { key: "issueTypes", type: "array", label: "Issue types" },
    { key: "lead", type: "object", label: "Lead" },
  ],

  execute(input, ctx) {
    return new JiraClient(ctx).request(`/project/${encodeURIComponent(input.projectKey)}`);
  },
};

export default projectGet;
