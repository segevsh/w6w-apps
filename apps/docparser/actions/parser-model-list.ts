import type { ActionDefinition } from "@w6w/types";
import { DocparserClient, encodeId, pageOf } from "../lib/client.ts";

interface Input {
  parserId: string;
}

const parserModelList: ActionDefinition<Input> = {
  key: "parser-model-list",
  type: "search",
  resource: "parser",
  title: "List Parser Model Layouts",
  description: "List the model layouts of one document parser (id and label).",
  params: [
    { key: "parserId", label: "Parser ID", type: "string", required: true },
  ],
  output: [
    { key: "items", type: "array", label: "Layouts ({id, label})" },
    { key: "count", type: "number", label: "Count" },
  ],

  async execute(input, ctx) {
    const id = encodeId(input.parserId, "parserId");
    return pageOf(await new DocparserClient(ctx).json<unknown[]>(`/v1/parser/models/${id}`));
  },
};

export default parserModelList;
