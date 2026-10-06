import type { ActionDefinition } from "@w6w/types";
import { USER, WakaClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** `GET /api/v1/users/current/status_bar/today` */
const statusBarGet: ActionDefinition<Input> = {
  key: "status-bar-get",
  type: "read",
  resource: "summary",
  title: "Get Today's Status Bar",
  description:
    "Today's coding activity as the editor status bar shows it. Cached: an empty summary comes back while the cache fills.",
  params: [],
  output: [
    { key: "data", type: "object", label: "Today's grand total and breakdowns" },
  ],

  execute(_input, ctx) {
    return new WakaClient(ctx).request("GET", `${USER}/status_bar/today`);
  },
};

export default statusBarGet;
