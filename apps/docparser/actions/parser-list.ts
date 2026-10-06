import type { ActionDefinition } from "@w6w/types";
import { DocparserClient, pageOf } from "../lib/client.ts";

const parserList: ActionDefinition<Record<string, never>> = {
  key: "parser-list",
  type: "search",
  resource: "parser",
  title: "List Document Parsers",
  description: "List every document parser on the account (id and label).",
  params: [],
  output: [
    { key: "items", type: "array", label: "Parsers ({id, label})" },
    { key: "count", type: "number", label: "Count" },
  ],

  async execute(_input, ctx) {
    return pageOf(await new DocparserClient(ctx).json<unknown[]>("/v1/parsers"));
  },
};

export default parserList;
