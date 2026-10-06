import type { ActionDefinition } from "@w6w/types";
import { LinkupClient } from "../lib/client.ts";
import { required } from "../lib/params.ts";

interface Input {
  q: string;
  asOf: string;
}

const rewindSearch: ActionDefinition<Input, Record<string, unknown>> = {
  key: "rewind-search",
  type: "search",
  resource: "rewind",
  title: "Search the Web as of a Past Day (Beta)",
  description: "Search the web as it was by the end of a given UTC day.",
  params: [
    { key: "q", label: "Query", type: "string", required: true },
    {
      key: "asOf",
      label: "As of (UTC day)",
      type: "string",
      required: true,
      placeholder: "2025-06-30",
      hint: "YYYY-MM-DD.",
    },
  ],
  output: [
    { key: "asOf", type: "string", label: "The UTC day searched" },
    { key: "results", type: "array", label: "name, url, content, validFrom, validTo" },
  ],

  async execute(input, ctx) {
    const asOf = required(input.asOf, "As of");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new Error("As of must be YYYY-MM-DD");
    const body = await new LinkupClient(ctx).post<{ asOf?: string; results?: unknown[] }>(
      "/v1/rewind/search",
      { q: required(input.q, "Query"), asOf },
    );
    return { asOf: body?.asOf ?? asOf, results: body?.results ?? [] };
  },
};

export default rewindSearch;
