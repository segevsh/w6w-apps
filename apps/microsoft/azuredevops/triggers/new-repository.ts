import type { TriggerDefinition } from "@w6w/types";
import { snapshotAdded } from "../lib/feeds.ts";
import repositoryList from "../actions/repository-list.ts";

type Repo = { id?: unknown };

/** One project's repositories, a small collection answered in one request (`pollSnapshot`). */
const trigger: TriggerDefinition<{ project: string }> = {
  key: "new-repository",
  title: "New Repository",
  description: "The run gets each git repository newly created in a project.",
  params: [{ key: "project", label: "Project", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Repository ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "defaultBranch", type: "string", label: "Default branch ref" },
  ],
  sample: {
    id: "5febef5a-833d-4e14-b9c0-14cb638f91e6",
    name: "Fabrikam",
    defaultBranch: "refs/heads/main",
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const out = await repositoryList.execute({ project: params.project }, ctx) as {
      repositories?: Repo[];
    };
    return snapshotAdded(state, out.repositories ?? [], (r) => String(r.id), "new-repository");
  },
};

export default trigger;
