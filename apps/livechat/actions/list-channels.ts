import type { ActionDefinition } from "@w6w/types";
import { asList, LIST_OUTPUT, LiveChatClient } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "list-channels",
  type: "search",
  resource: "channel",
  title: "List channels",
  description:
    "Channels that have had chat activity: `code` (the widget), `direct_link` and `integration` " +
    "(`POST /v3.6/configuration/action/list_channels`). Needs no scope.",
  params: [],
  output: LIST_OUTPUT,

  async execute(_input, ctx) {
    return asList(await new LiveChatClient(ctx).config("list_channels"));
  },
};

export default action;
