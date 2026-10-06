import type { ActionDefinition } from "@w6w/types";
import { USER, WakaClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** `GET /api/v1/users/current/leaderboards` */
const leaderboardList: ActionDefinition<Input> = {
  key: "leaderboard-list",
  type: "read",
  resource: "leaderboard",
  title: "List Private Leaderboards",
  description: "The user's private leaderboards.",
  params: [],
  output: [
    { key: "data", type: "array", label: "Leaderboards" },
  ],

  execute(_input, ctx) {
    return new WakaClient(ctx).request("GET", `${USER}/leaderboards`);
  },
};

export default leaderboardList;
