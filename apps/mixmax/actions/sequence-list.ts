import type { ActionDefinition } from "@w6w/types";
import { MixmaxClient, resultsOf } from "../lib/client.ts";

interface Input {
  name?: string;
  folder?: string;
  expandStages?: boolean;
  limit?: number;
  next?: string;
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
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Sequences per page (Mixmax default and maximum 100).",
    },
    {
      key: "next",
      label: "Next cursor",
      type: "string",
      hint: "The `next` cursor returned by the previous page.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "Sequences" },
    { key: "next", type: "string", label: "Next page cursor" },
    { key: "hasNext", type: "boolean", label: "Has a next page" },
  ],

  async execute(input, ctx) {
    const r = await new MixmaxClient(ctx).request("GET", "/sequences", {
      query: {
        name: input.name,
        folder: input.folder,
        expand: input.expandStages ? "stages" : undefined,
        limit: input.limit,
        next: input.next,
      },
    });
    const b = (r ?? {}) as { next?: string; hasNext?: boolean };
    // Cursor fields only when the page carries them, so the plain response shape is unchanged.
    return b.next === undefined && b.hasNext === undefined
      ? { results: resultsOf(r) }
      : { results: resultsOf(r), next: b.next, hasNext: b.hasNext === true };
  },
};

export default sequenceList;
