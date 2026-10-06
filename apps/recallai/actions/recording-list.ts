import type { ActionDefinition } from "@w6w/types";
import { RecallClient } from "../lib/client.ts";
import { CURSOR_OUTPUT, cursorParam } from "../lib/params.ts";

interface Input {
  botId?: string;
  createdAfter?: string;
  createdBefore?: string;
  statusCode?: string;
  cursor?: string;
}

/** `GET /api/v1/recording/` — cursor-paginated: `{ next, previous, results }`. */
const action: ActionDefinition<Input> = {
  key: "recording-list",
  type: "search",
  resource: "recording",
  title: "List Recordings",
  description:
    "List recordings, newest first, filtered by bot, creation window or status. Each carries media shortcuts.",
  params: [
    { key: "botId", label: "Bot ID", type: "string", hint: "Only recordings of this bot." },
    { key: "createdAfter", label: "Created after", type: "datetime", hint: "ISO 8601." },
    { key: "createdBefore", label: "Created before", type: "datetime", hint: "ISO 8601." },
    {
      key: "statusCode",
      label: "Status",
      type: "select",
      options: [{ value: "done", label: "done" }, { value: "failed", label: "failed" }, {
        value: "paused",
        label: "paused",
      }, { value: "processing", label: "processing" }],
    },
    cursorParam,
  ],
  output: [{ key: "recordings", type: "array", label: "Items on this page" }, ...CURSOR_OUTPUT],

  async execute(input, ctx) {
    const { items, nextCursor } = await new RecallClient(ctx).list("/api/v1/recording/", {
      query: {
        bot_id: input.botId,
        created_at_after: input.createdAfter,
        created_at_before: input.createdBefore,
        status_code: input.statusCode,
        cursor: input.cursor,
      },
    });
    return { recordings: items, ...(nextCursor ? { nextCursor } : {}) };
  },
};

export default action;
