import type { ActionDefinition } from "@w6w/types";
import { WistiaClient } from "../lib/client.ts";

const statsAccountGet: ActionDefinition<Record<string, never>> = {
  key: "stats-account-get",
  type: "read",
  resource: "stats",
  title: "Get Account Stats",
  description:
    "Account-wide totals: loads, plays and hours watched. Needs the Read detailed stats permission.",
  params: [],
  output: [
    { key: "load_count", type: "number", label: "Loads" },
    { key: "play_count", type: "number", label: "Plays" },
    { key: "hours_watched", type: "number", label: "Hours watched" },
  ],

  execute(_input, ctx) {
    return new WistiaClient(ctx).json("/stats/account");
  },
};

export default statsAccountGet;
