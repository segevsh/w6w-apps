import type { ActionDefinition } from "@w6w/types";
import { FindymailClient } from "../lib/client.ts";

interface Input {
  ownership?: string;
}

const listMonitors: ActionDefinition<Input> = {
  key: "list-monitors",
  type: "read",
  resource: "monitor",
  title: "List Monitors",
  description:
    "List signal monitors the user owns or shares with the team, newest first, each with a `match_count`. Findymail's response is a bare array, returned here as `monitors`.",
  params: [{
    "key": "ownership",
    "label": "Ownership",
    "type": "select",
    "options": [{ "value": "my", "label": "Mine" }, { "value": "team", "label": "Team" }, {
      "value": "all",
      "label": "All",
    }],
  }],
  output: [{ "key": "monitors", "type": "array", "label": "Monitors" }],

  async execute(input, ctx) {
    const body = await new FindymailClient(ctx).request<unknown[]>("GET", "/api/signals/monitors", {
      query: { ownership: input.ownership },
    });
    return { monitors: Array.isArray(body) ? body : [] };
  },
};

export default listMonitors;
