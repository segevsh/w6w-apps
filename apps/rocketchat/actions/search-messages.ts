import type { ActionDefinition } from "@w6w/types";
import { COUNT_PARAM, OFFSET_PARAM, RocketChatClient } from "../lib/client.ts";

interface Input {
  roomId: string;
  searchText: string;
  count?: number;
  offset?: number;
}

const searchMessages: ActionDefinition<Input> = {
  key: "search-messages",
  type: "search",
  resource: "message",
  title: "Search Messages",
  description: "Search the messages of one room by text (`GET /chat.search`).",
  params: [
    { key: "roomId", label: "Room ID", type: "string", required: true },
    {
      key: "searchText",
      label: "Search text",
      type: "string",
      required: true,
      hint: "Plain text. Rocket.Chat also understands `from:username`, `has:url` and similar " +
        "filters here.",
    },
    { ...COUNT_PARAM },
    { ...OFFSET_PARAM },
  ],
  output: [{ key: "messages", type: "array", label: "Matching messages (with `score`)" }],

  execute(input, ctx) {
    return new RocketChatClient(ctx).request("/chat.search", {
      query: {
        roomId: input.roomId,
        searchText: input.searchText,
        count: input.count,
        offset: input.offset,
      },
    });
  },
};

export default searchMessages;
