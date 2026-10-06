import type { ActionDefinition } from "@w6w/types";
import { compact, FindymailClient, intList } from "../lib/client.ts";

interface Input {
  seed: string;
  same_country?: boolean;
  same_size?: boolean;
  limit?: number;
  exclusion_list_ids?: string;
}

const lookalikeSearch: ActionDefinition<Input> = {
  key: "lookalike-search",
  type: "search",
  resource: "intellimatch",
  title: "Search Lookalike Companies",
  description:
    "Find companies similar to a seed domain. Costs 1 finder credit per 10 results returned (rounded up). The 200 body is not shown in Findymail's reference, so it is returned verbatim as `result`. Spends credits only on a hit; a 402 means the balance is empty and a 423 that the subscription is paused.",
  params: [
    { "key": "seed", "label": "Seed domain or URL", "type": "string", "required": true },
    { "key": "same_country", "label": "Same country as the seed", "type": "boolean" },
    { "key": "same_size", "label": "Same size range as the seed", "type": "boolean" },
    { "key": "limit", "label": "Limit", "type": "number", "hint": "Default 100, max 10000." },
    {
      "key": "exclusion_list_ids",
      "label": "Exclusion list IDs",
      "type": "string",
      "hint": "Comma-separated IDs of exclusion lists to filter out known companies.",
    },
  ],
  output: [{ "key": "result", "type": "object", "label": "Findymail's response, verbatim" }],

  async execute(input, ctx) {
    const body = await new FindymailClient(ctx).request("POST", "/api/lookalike/search", {
      body: compact({
        seed: input.seed,
        same_country: input.same_country,
        same_size: input.same_size,
        limit: input.limit,
        exclusion_list_ids: intList(input.exclusion_list_ids, "Exclusion list IDs"),
      }),
    });
    return { result: body };
  },
};

export default lookalikeSearch;
