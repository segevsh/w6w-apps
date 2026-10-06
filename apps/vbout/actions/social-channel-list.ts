import type { ActionDefinition } from "@w6w/types";
import { VboutClient } from "../lib/client.ts";

/**
 * `GET /1/socialmedia/channels.json` — Return the connected social media channels.
 */
type Input = Record<string, never>;

const socialChannelList: ActionDefinition<Input> = {
  key: "social-channel-list",
  type: "read",
  resource: "channel",
  title: "List Social Channels",
  description: "Return the connected social media channels.",
  params: [],
  output: [
    { key: "channels", type: "object", label: "Channels keyed by network" },
  ],

  async execute(_input, ctx) {
    return await new VboutClient(ctx).get("socialmedia/channels");
  },
};

export default socialChannelList;
