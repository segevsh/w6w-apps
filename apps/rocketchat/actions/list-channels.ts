import type { ActionDefinition } from "@w6w/types";
import { COUNT_PARAM, OFFSET_PARAM, RocketChatClient, SORT_PARAM } from "../lib/client.ts";

interface Input {
  joinedOnly?: boolean;
  count?: number;
  offset?: number;
  sort?: string;
}

// `query` and `fields` (raw MongoDB filters) are deliberately not exposed: the spec calls
// `query` unsafe and deprecated and servers may refuse them.
const listChannels: ActionDefinition<Input> = {
  key: "list-channels",
  type: "read",
  resource: "channel",
  title: "List Channels",
  description:
    "List public channels (`GET /channels.list`), or only the ones the connected user has " +
    "joined (`GET /channels.list.joined`). Paged with `count` / `offset`.",
  params: [
    {
      key: "joinedOnly",
      label: "Joined only",
      type: "boolean",
      default: false,
      hint: "Only channels the connected user is a member of.",
    },
    { ...COUNT_PARAM },
    { ...OFFSET_PARAM },
    { ...SORT_PARAM },
  ],
  output: [
    { key: "channels", type: "array", label: "Channels" },
    { key: "count", type: "number", label: "Items returned" },
    { key: "offset", type: "number", label: "Offset used" },
    { key: "total", type: "number", label: "Total channels" },
  ],

  execute(input, ctx) {
    return new RocketChatClient(ctx).request(
      input.joinedOnly ? "/channels.list.joined" : "/channels.list",
      { query: { count: input.count, offset: input.offset, sort: input.sort } },
    );
  },
};

export default listChannels;
