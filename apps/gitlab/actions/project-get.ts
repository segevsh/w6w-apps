import type { ActionDefinition } from "@w6w/types";
import { GitLabClient, projectPath } from "../lib/client.ts";
import { projectId } from "../lib/params.ts";

const projectGet: ActionDefinition<{ projectId: string }> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Fetch a project's metadata by id or path.",
  params: [projectId],
  output: [
    { key: "id", type: "number", label: "Project ID" },
    { key: "path_with_namespace", type: "string", label: "Full path" },
    { key: "visibility", type: "string", label: "Visibility" },
    { key: "default_branch", type: "string", label: "Default branch" },
    { key: "web_url", type: "string", label: "URL" },
  ],

  execute(input, ctx) {
    return new GitLabClient(ctx).request(`/projects/${projectPath(input.projectId)}`);
  },
};

export default projectGet;
