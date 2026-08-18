import type { ActionDefinition } from "@w6w/types";
import { AzureDevOpsClient } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /{org}/{project}/_apis/git/repositories` — the git repositories in a
 * project.
 *
 * Azure DevOps nests repositories inside projects, which is the structural
 * difference from GitHub and GitLab worth holding onto: a repository's identity
 * is `organization → project → repository`, and two projects can hold
 * repositories with the same name.
 *
 * The field worth reading is **`isDisabled`**. A disabled repository is still
 * listed, still has its id, and rejects every operation — so a workflow that
 * finds it by name and then fails to create a pull request is looking at the
 * right repository in the wrong state. This action separates them out.
 *
 * `defaultBranch` comes back as a full ref (`refs/heads/main`), not a bare
 * name, which is what most of the git endpoints want anyway.
 */
const action: ActionDefinition = {
  key: "repository-list",
  type: "read",
  resource: "repository",
  title: "List repositories",
  description:
    "Git repositories in a project — Azure DevOps nests them, so two projects can hold the same " +
    "name. Disabled repositories are still listed and reject every operation.",
  params: [PROJECT_PARAM],
  output: [
    { key: "repositories", type: "array", label: "Repositories" },
    { key: "count", type: "number", label: "Repositories returned" },
    { key: "disabled", type: "array", label: "Listed but rejecting every operation" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.project ?? "").trim();
    if (!project) throw new Error("`project` is required");

    const client = new AzureDevOpsClient(ctx);
    const repositories = await client.list<{ name?: string; isDisabled?: boolean }>(
      client.path(project, "_apis/git/repositories"),
    );

    return {
      repositories,
      count: repositories.length,
      disabled: repositories
        .filter((r) => r?.isDisabled === true)
        .map((r) => String(r?.name ?? "")),
    };
  },
};

export default action;
