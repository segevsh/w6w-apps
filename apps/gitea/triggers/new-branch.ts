import { collectAll, snapshotTrigger } from "../lib/triggers.ts";
import branchList from "../actions/branch-list.ts";
import { OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

interface Params {
  repo?: string;
  owner?: string;
}

/**
 * Bounded collection (brief 9.1 c): `GET /repos/{owner}/{repo}/branches` takes `page` and
 * `limit` and documents no sort or created filter
 * (https://docs.gitea.com/api/1.24/#tag/repository/operation/repoListBranches , verified
 * 2026-11-10), so every branch is read and compared by name. The kit refuses more than 5000.
 */
export default snapshotTrigger<Params>({
  key: "new-branch",
  title: "New Branch",
  description: "The run gets each branch newly created in the chosen repository.",
  params: [REPO_PARAM, OWNER_PARAM],
  output: [
    { key: "name", type: "string", label: "Branch name" },
    { key: "protected", type: "boolean", label: "Protected" },
    { key: "commit", type: "object", label: "Head commit" },
  ],
  sample: {
    name: "feature/retries",
    protected: false,
    commit: { id: "3f2a9c1d5e7b4a6c8d0e1f2a3b4c5d6e7f8a9b0c", message: "Add retries" },
  },
  fetchRows: (params, ctx) =>
    collectAll(
      (limit) => branchList.execute({ ...params, limit }, ctx),
      "branch list",
    ),
  idOf: (row) => (row as { name?: unknown }).name,
});
