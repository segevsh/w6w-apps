import type { ActionDefinition } from "@w6w/types";
import { RecallClient } from "../lib/client.ts";
import { CURSOR_OUTPUT, cursorParam } from "../lib/params.ts";

interface Input {
  recordingId?: string;
  createdAfter?: string;
  createdBefore?: string;
  statusCode?: string;
  cursor?: string;
}

/** `GET /api/v1/participant_events/` — cursor-paginated: `{ next, previous, results }`. */
const action: ActionDefinition<Input> = {
  key: "participant-events-list",
  type: "search",
  resource: "participant_events",
  title: "List Participant Events",
  description:
    "List participant-event artifacts. Each carries `data` download URLs for the raw events, the speaker timeline and the participants list.",
  params: [
    {
      key: "recordingId",
      label: "Recording ID",
      type: "string",
      hint: "Only artifacts of this recording.",
    },
    { key: "createdAfter", label: "Created after", type: "datetime", hint: "ISO 8601." },
    { key: "createdBefore", label: "Created before", type: "datetime", hint: "ISO 8601." },
    {
      key: "statusCode",
      label: "Status",
      type: "select",
      options: [{ value: "done", label: "done" }, { value: "failed", label: "failed" }, {
        value: "processing",
        label: "processing",
      }],
    },
    cursorParam,
  ],
  output: [
    { key: "participantEvents", type: "array", label: "Items on this page" },
    ...CURSOR_OUTPUT,
  ],

  async execute(input, ctx) {
    const { items, nextCursor } = await new RecallClient(ctx).list("/api/v1/participant_events/", {
      query: {
        recording_id: input.recordingId,
        created_at_after: input.createdAfter,
        created_at_before: input.createdBefore,
        status_code: input.statusCode,
        cursor: input.cursor,
      },
    });
    return { participantEvents: items, ...(nextCursor ? { nextCursor } : {}) };
  },
};

export default action;
