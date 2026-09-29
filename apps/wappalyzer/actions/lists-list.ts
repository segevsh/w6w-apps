import type { ActionDefinition } from "@w6w/types";
import { PATHS, WappalyzerClient } from "../lib/client.ts";

/**
 * `GET /v2/lists/` — every lead list this account has created.
 *
 * Verified against `listLeadLists` in Wappalyzer's OpenAPI contract and
 * `docs/api/v2/lists/` (fetched 2026-09-29). Free, and the OpenAPI document
 * declares no `wappalyzer-credits-*` response headers for it (unlike the
 * lookup/subdomains/verify/credits-balance reads), so this action does not
 * claim any.
 */
type Input = Record<string, never>;

const listsList: ActionDefinition<Input> = {
  key: "lists-list",
  type: "search",
  resource: "list",
  title: "List Lead Lists",
  description: "List the lead lists this account has created, with status, pricing and size.",
  params: [],
  output: [{ key: "results", type: "array", label: "Lead lists" }],

  async execute(_input, ctx) {
    const client = new WappalyzerClient(ctx);
    const { data } = await client.get<unknown[]>(PATHS.lists);
    return { results: data ?? [] };
  },
};

export default listsList;
