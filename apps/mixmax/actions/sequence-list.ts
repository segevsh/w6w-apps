import type { ActionDefinition } from "@w6w/types";
import { MixmaxClient, resultsOf } from "../lib/client.ts";

interface Input {
  name?: string;
  folder?: string;
  expandStages?: boolean;
}

const sequenceList: ActionDefinition<Input> = {
  key: "sequence-list",
  type: "read",
  resource: "sequence",
  title: "List Sequences",
  description:
    "List the sequences you can access (including shared ones), optionally filtered by name or folder.",
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: "Return sequences whose name matches this string.",
    },
    {
      key: "folder",
      label: "Folder ID",
      type: "string",
      hint: "Only sequences in this folder. Omit to include every sequence you can access.",
    },
    {
      key: "expandStages",
      label: "Expand stages",
      type: "boolean",
      hint: "Return full stage information.",
    },
  ],
  output: [{ key: "results", type: "array", label: "Sequences" }],

  async execute(input, ctx) {
    const r = await new MixmaxClient(ctx).request("GET", "/sequences", {
      query: {
        name: input.name,
        folder: input.folder,
        expand: input.expandStages ? "stages" : undefined,
      },
    });
    return { results: resultsOf(r) };
  },
};

export default sequenceList;
