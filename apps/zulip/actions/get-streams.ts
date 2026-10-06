import type { ActionDefinition } from "@w6w/types";
import { payload, ZulipClient } from "../lib/client.ts";

interface Input {
  include_public?: boolean;
  include_subscribed?: boolean;
  include_web_public?: boolean;
  include_all_active?: boolean;
  include_default?: boolean;
  exclude_archived?: boolean;
}

const getStreams: ActionDefinition<Input> = {
  key: "get-streams",
  type: "read",
  resource: "channel",
  title: "List Channels",
  description:
    "List the channels the user can see (GET /streams). Zulip calls them streams in the API.",
  params: [
    {
      "key": "include_public",
      "label": "Include public channels",
      "type": "boolean",
      "hint": "Zulip default true.",
    },
    {
      "key": "include_subscribed",
      "label": "Include subscribed channels",
      "type": "boolean",
      "hint": "Zulip default true.",
    },
    {
      "key": "include_web_public",
      "label": "Include web-public channels",
      "type": "boolean",
    },
    {
      "key": "include_all_active",
      "label": "Include all active (admin)",
      "type": "boolean",
      "hint": "Administrators only: every channel, including private ones the user is not in.",
    },
    {
      "key": "include_default",
      "label": "Flag default channels",
      "type": "boolean",
    },
    {
      "key": "exclude_archived",
      "label": "Exclude archived",
      "type": "boolean",
      "hint": "Zulip default true.",
    },
  ],
  output: [
    {
      "key": "streams",
      "type": "array",
      "label": "Channels",
    },
  ],

  async execute(input, ctx) {
    const res = await new ZulipClient(ctx).request("GET", "/streams", { query: { ...input } });
    return payload(res);
  },
};

export default getStreams;
