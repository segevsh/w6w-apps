import type { ActionDefinition } from "@w6w/types";
import { PylonClient, seg } from "../lib/client.ts";
import { cursorParam, idParam, PAGE_OUTPUT } from "../lib/params.ts";

interface Input {
  id: string;
  cursor?: string;
  limit?: number;
}

/**
 * `GET /issues/{id}/messages` — oldest first, replies and internal notes together. Omitting BOTH
 * `limit` and `cursor` returns every message (backward compatibility); a cursor without a limit
 * pages at 100.
 */
const messageList: ActionDefinition<Input> = {
  key: "message-list",
  type: "read",
  resource: "message",
  title: "List Issue Messages",
  description:
    "List an issue's messages, replies and internal notes, oldest first. With no limit and no cursor every message is returned. A message's top-level `id` is what Reply to Issue needs.",
  params: [
    idParam("Issue ID or number"),
    cursorParam,
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "1-1000. Omit (with no cursor) to return all messages; a cursor alone pages at 100.",
      validation: { min: 1, max: 1000, integer: true },
    },
  ],
  output: [{ key: "messages", type: "array", label: "Messages" }, ...PAGE_OUTPUT],

  async execute(input, ctx) {
    const { items, ...page } = await new PylonClient(ctx).list(
      "GET",
      `/issues/${seg(input.id)}/messages`,
      { query: { cursor: input.cursor, limit: input.limit } },
    );
    return { messages: items, ...page };
  },
};

export default messageList;
