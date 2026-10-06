import type { ActionDefinition } from "@w6w/types";
import { VboutClient } from "../lib/client.ts";

/**
 * `GET /1/socialmedia/stats.json` — Return click/track statistics of posted social links.
 */
interface Input {
  channels?: string;
  sort?: string;
}

const socialStatsList: ActionDefinition<Input> = {
  key: "social-stats-list",
  type: "read",
  resource: "channel",
  title: "List Social Post Stats",
  description: "Return click/track statistics of posted social links.",
  params: [
    {
      key: "channels",
      label: "Channels",
      type: "select",
      options: [
        { value: "all", label: "all" },
        { value: "facebook", label: "facebook" },
        { value: "twitter", label: "twitter" },
        { value: "linkedin", label: "linkedin" },
        { value: "pinterest", label: "pinterest" },
      ],
    },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      options: [{ value: "asc", label: "asc" }, { value: "desc", label: "desc" }],
    },
  ],
  output: [
    { key: "stats", type: "object", label: "Stats: { items[] }" },
  ],

  async execute(input, ctx) {
    return await new VboutClient(ctx).get("socialmedia/stats", {
      channels: input.channels,
      sort: input.sort,
    });
  },
};

export default socialStatsList;
