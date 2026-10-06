import type { ActionDefinition } from "@w6w/types";
import { DocparserClient, encodeId, pageOf } from "../lib/client.ts";
import { formatParam } from "../lib/params.ts";

interface Input {
  parserId: string;
  documentId: string;
  format?: string;
  includeChildren?: boolean;
}

const resultsGet: ActionDefinition<Input> = {
  key: "results-get",
  type: "read",
  resource: "result",
  title: "Get Parsed Data of One Document",
  description:
    "Fetch the parsed data of one document. Docparser answers an array; `result` is its first " +
    "element, and `items` holds all of them (more than one with Include children). Rate limit: " +
    "60 calls per minute.",
  params: [
    { key: "parserId", label: "Parser ID", type: "string", required: true },
    { key: "documentId", label: "Document ID", type: "string", required: true },
    formatParam,
    {
      key: "includeChildren",
      label: "Include child documents",
      type: "boolean",
      hint: "Also return child documents created by preprocessing, e.g. a split.",
    },
  ],
  output: [
    { key: "result", type: "object", label: "Parsed data of the document (null if none)" },
    { key: "items", type: "array", label: "All returned documents" },
    { key: "count", type: "number", label: "Count" },
  ],

  async execute(input, ctx) {
    const p = encodeId(input.parserId, "parserId");
    const d = encodeId(input.documentId, "documentId");
    const rows = await new DocparserClient(ctx).json<unknown[]>(`/v1/results/${p}/${d}`, {
      query: {
        format: input.format,
        include_children: input.includeChildren ? "true" : undefined,
      },
    });
    const page = pageOf(rows);
    return { result: page.items[0] ?? null, ...page };
  },
};

export default resultsGet;
