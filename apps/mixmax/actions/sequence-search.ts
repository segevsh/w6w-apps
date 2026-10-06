import type { ActionDefinition } from "@w6w/types";
import { MixmaxClient, strList } from "../lib/client.ts";

interface Input {
  query?: string;
  recipients?: string;
  sequenceId?: string;
  offset?: number;
  limit?: number;
}

const sequenceSearch: ActionDefinition<Input> = {
  key: "sequence-search",
  type: "read",
  resource: "sequence",
  title: "Search Sequence Recipients",
  description:
    "Find the status of recipients in sequences by email address, optionally within one sequence.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      hint: "Search string; matches recipient email address.",
    },
    {
      key: "recipients",
      label: "Recipients",
      type: "string",
      hint: "Comma-separated recipient emails. Either Query or Recipients is required.",
    },
    { key: "sequenceId", label: "Sequence ID", type: "string", hint: "Restrict to one sequence." },
    { key: "offset", label: "Offset", type: "number", hint: "Records to skip." },
    { key: "limit", label: "Limit", type: "number", hint: "Records to return." },
  ],
  output: [{ key: "results", type: "array", label: "Matches" }, {
    key: "total",
    type: "number",
    label: "Total",
  }],

  async execute(input, ctx) {
    const r = await new MixmaxClient(ctx).request<{ results?: unknown[]; total?: number }>(
      "GET",
      "/sequences/search",
      {
        query: {
          query: input.query,
          recipients: strList(input.recipients),
          sequenceId: input.sequenceId,
          offset: input.offset,
          limit: input.limit,
        },
      },
    );
    return { results: r.results ?? [], total: r.total ?? 0 };
  },
};

export default sequenceSearch;
