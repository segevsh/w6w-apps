import type { ActionDefinition } from "@w6w/types";
import { GitHubClient, repoPath } from "../lib/client.ts";
import { owner, repository } from "../lib/params.ts";

const repositoryGet: ActionDefinition<{ owner: string; repository: string }> = {
  key: "repository-get",
  type: "read",
  resource: "repository",
  title: "Get Repository",
  description: "Fetch a repository's metadata.",
  params: [owner, repository],
  output: [
    { key: "id", type: "number", label: "Repository ID" },
    { key: "full_name", type: "string", label: "Full name" },
    { key: "private", type: "boolean", label: "Private" },
    { key: "default_branch", type: "string", label: "Default branch" },
    { key: "html_url", type: "string", label: "URL" },
  ],

  execute(input, ctx) {
    return new GitHubClient(ctx).request(`/repos/${repoPath(input.owner, input.repository)}`);
  },
};

export default repositoryGet;
