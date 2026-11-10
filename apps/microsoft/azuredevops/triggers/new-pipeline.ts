import type { TriggerDefinition } from "@w6w/types";
import { SNAPSHOT_TOP, snapshotAdded } from "../lib/feeds.ts";
import buildDefinitionList from "../actions/build-definition-list.ts";

type Def = { id?: unknown };

/** One project's pipeline definitions, requested with `$top=1000` and diffed with `pollSnapshot`. */
const trigger: TriggerDefinition<{ project: string }> = {
  key: "new-pipeline",
  title: "New Pipeline",
  description: "The run gets each build pipeline (definition) newly created in a project.",
  params: [{ key: "project", label: "Project", type: "string", required: true }],
  output: [
    { key: "id", type: "number", label: "Pipeline ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "path", type: "string", label: "Folder path" },
  ],
  sample: { id: 12, name: "CI", path: "\\" },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const out = await buildDefinitionList.execute(
      { project: params.project, includeLatestBuilds: false, limit: SNAPSHOT_TOP },
      ctx,
    ) as { definitions?: Def[] };
    return snapshotAdded(state, out.definitions ?? [], (d) => String(d.id), "new-pipeline");
  },
};

export default trigger;
