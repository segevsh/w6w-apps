import type { ActionDefinition } from "@w6w/types";
import { MixmaxClient, resultsOf } from "../lib/client.ts";

type Input = Record<string, never>;

const sequenceFolderList: ActionDefinition<Input> = {
  key: "sequence-folder-list",
  type: "read",
  resource: "sequence",
  title: "List Sequence Folders",
  description: "List sequence folders you can access.",
  params: [],
  output: [{ key: "results", type: "array", label: "Folders" }],

  async execute(_input, ctx) {
    const r = await new MixmaxClient(ctx).request("GET", "/sequencefolders");
    return { results: resultsOf(r) };
  },
};

export default sequenceFolderList;
