import type { ActionDefinition } from "@w6w/types";
import { GitHubClient, repoPath } from "../lib/client.ts";
import { owner, repository } from "../lib/params.ts";

const repositoryGetLicense: ActionDefinition<{ owner: string; repository: string }> = {
  key: "repository-get-license",
  type: "read",
  resource: "repository",
  title: "Get Repository License",
  description: "Fetch the licence GitHub detected for a repository, with the licence file itself.",
  params: [owner, repository],
  output: [
    { key: "license", type: "object", label: "Detected licence" },
    { key: "name", type: "string", label: "Licence file name" },
    { key: "content", type: "string", label: "Base64 file content" },
  ],

  execute(input, ctx) {
    return new GitHubClient(ctx).request(
      `/repos/${repoPath(input.owner, input.repository)}/license`,
    );
  },
};

export default repositoryGetLicense;
