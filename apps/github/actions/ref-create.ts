import type { ActionDefinition } from "@w6w/types";
import { GitHubClient, repoPath } from "../lib/client.ts";
import { owner, repository } from "../lib/params.ts";

interface Input {
  owner: string;
  repository: string;
  branch: string;
  fromSha: string;
}

/**
 * GitHub creates a branch (or any ref) by POSTing the fully-qualified ref name
 * and the SHA it should point at to the *collection* endpoint — unlike
 * `ref-get`, the ref name never reaches the URL, so there is no `contentsPath`
 * splice here; it is refused directly against the same three illegal-segment
 * cases.
 */
const refCreate: ActionDefinition<Input> = {
  key: "ref-create",
  type: "perform",
  resource: "repository",
  title: "Create Branch",
  description: "Create a new branch (ref) pointing at a given commit SHA.",
  // POST .../git/refs answers 422 "Reference already exists" on replay rather
  // than being a compare-and-set like put/delete.
  idempotent: false,
  params: [owner, repository, {
    key: "branch",
    label: "Branch",
    type: "string",
    required: true,
    hint: "Branch name without the `refs/heads/` prefix, e.g. `main`.",
  }, {
    key: "fromSha",
    label: "From SHA",
    type: "string",
    required: true,
    hint: "Commit SHA the new branch should point at.",
  }],
  output: [
    { key: "ref", type: "string", label: "Ref" },
    { key: "object", type: "object", label: "Target object ({ sha, type, url })" },
  ],

  execute(input, ctx) {
    const segments = input.branch.split("/");
    for (const s of segments) {
      if (s === "" || s === "." || s === "..") {
        throw new Error(
          `Illegal branch segment in "${input.branch}": segments may not be empty, "." or "..".`,
        );
      }
    }
    return new GitHubClient(ctx).request(
      `/repos/${repoPath(input.owner, input.repository)}/git/refs`,
      {
        method: "POST",
        body: { ref: `refs/heads/${input.branch}`, sha: input.fromSha },
      },
    );
  },
};

export default refCreate;
