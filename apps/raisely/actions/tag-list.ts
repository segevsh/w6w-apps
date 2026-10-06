import type { ActionDefinition } from "@w6w/types";
import { compact, RaiselyClient } from "../lib/client.ts";
import { type ListInput, listParams, listQuery, privateParam } from "../lib/params.ts";

interface Input extends ListInput {
  recordType?: string;
  path?: string;
}

const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "read",
  resource: "tag",
  title: "List Tags",
  description: "List tags, optionally filtered by record type or path.",
  params: [
    {
      key: "recordType",
      label: "Record type",
      type: "string",
      hint: "Only tags for this record type.",
    },
    { key: "path", label: "Path", type: "string", hint: "Only the tag with this path." },
    privateParam(),
    ...listParams(),
  ],
  output: [
    { key: "data", type: "array", label: "List Tags" },
    {
      key: "pagination",
      type: "object",
      label: "Pagination (total, pages, offset, limit, nextUrl)",
    },
  ],

  async execute(input, ctx) {
    return await new RaiselyClient(ctx).list("/tags", {
      query: {
        ...listQuery(input),
        ...compact({
          recordType: input.recordType,
          path: input.path,
        }),
      },
    });
  },
};

export default tagList;
