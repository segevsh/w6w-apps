import type { ActionDefinition } from "@w6w/types";
import { KvCoreClient, type KvCoreListPage } from "../lib/client.ts";

interface TeamSummary {
  id: number;
  name?: string;
  type?: string;
}

/**
 * `GET /v2/public/teams` — list teams on the account.
 *
 * The vendor's OpenAPI document declares no query parameters for this
 * operation (unlike `GET /offices`, which documents `page`/`limit`
 * explicitly) and its reference page carries no worked response example, so
 * no pagination params are offered here rather than guessed at.
 */
const teamList: ActionDefinition<Record<string, never>> = {
  key: "team-list",
  type: "search",
  resource: "team",
  title: "List Teams",
  description: "List teams on the account.",
  params: [],
  output: [
    { key: "data", type: "array", label: "Teams" },
  ],

  async execute(_input, ctx) {
    return await new KvCoreClient(ctx).json<KvCoreListPage<TeamSummary>>("/teams");
  },
};

export default teamList;
