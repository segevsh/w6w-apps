import type { ActionDefinition } from "@w6w/types";
import { TremendousClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /rewards` — list rewards, newest first.
 *
 * `list-rewards` documents no filter beyond `offset`/`limit`. The reference
 * mentions querying by custom-field label/value as query params, but that
 * requires knowing the caller's own custom field labels ahead of time and is
 * left out — see the README.
 */
interface Input {
  offset?: number;
  limit?: number;
}

const rewardList: ActionDefinition<Input> = {
  key: "reward-list",
  type: "search",
  resource: "reward",
  title: "List Rewards",
  description: "List rewards, newest first.",
  // Documented default 100, maximum 500.
  params: paginationParams(100, 500),
  output: [{ key: "rewards", type: "array", label: "Rewards" }],

  execute(input, ctx) {
    return new TremendousClient(ctx).json("/rewards", {
      query: { offset: input.offset, limit: input.limit },
    });
  },
};

export default rewardList;
