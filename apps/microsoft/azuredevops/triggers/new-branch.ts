import type { TriggerDefinition } from "@w6w/types";
import { snapshotAdded } from "../lib/feeds.ts";
import branchList from "../actions/branch-list.ts";

type Ref = { name?: unknown };

/**
 * One repository's branch refs (`refs/heads/…`, one request, up to 1000 refs; see
 * https://learn.microsoft.com/en-us/rest/api/azure/devops/git/refs/list), diffed with `pollSnapshot`.
 */
const trigger: TriggerDefinition<{ project: string; repository: string }> = {
  key: "new-branch",
  title: "New Branch",
  description: "The run gets each branch newly created in a repository.",
  params: [
    { key: "project", label: "Project", type: "string", required: true },
    { key: "repository", label: "Repository", type: "string", required: true },
  ],
  output: [
    { key: "name", type: "string", label: "Full ref (refs/heads/…)" },
    { key: "objectId", type: "string", label: "Commit SHA the branch points at" },
  ],
  sample: {
    name: "refs/heads/feature/login",
    objectId: "9991b4f66def4c0a9ad8f9f27043ece7eddcf1c7",
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const out = await branchList.execute(
      { project: params.project, repository: params.repository, kind: "heads" },
      ctx,
    ) as { refs?: Ref[] };
    return snapshotAdded(state, out.refs ?? [], (r) => String(r.name), "new-branch");
  },
};

export default trigger;
