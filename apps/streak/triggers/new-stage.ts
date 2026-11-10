import type { Param } from "@w6w/types";
import stageList from "../actions/stage-list.ts";
import { resultsOf, snapshotTrigger } from "../lib/snapshot.ts";

/**
 * Snapshot poll (brief 9.1 c) of one pipeline the user picks. `GET /pipelines/{key}/stages` returns the
 * pipeline's stages whole as an object keyed by stage key (the README's list-envelope table); the
 * action flattens it to rows and a pipeline has a handful of stages.
 */
export default snapshotTrigger<{ pipelineKey: string }>({
  key: "new-stage",
  title: "New Stage",
  description: "The run gets each stage newly added to the selected pipeline.",
  params: (stageList.params ?? []) as Param[],
  output: [
    { key: "key", type: "string", label: "Stage key" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { key: "5001", name: "Interview" },
  rows: async (p, ctx) => resultsOf(await stageList.execute({ pipelineKey: p.pipelineKey }, ctx)),
});
