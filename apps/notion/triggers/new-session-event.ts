import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/query-session-events.ts";

interface Params {
  sessionId: string;
}

const trigger = pollFromListAction<Params>({
  key: "new-session-event",
  title: "New Agent Session Event",
  description:
    "The run gets each new event (a message, a tool call, a status change) in one Notion agent session, checked by sequence number, newest first.",
  action: action as unknown as ActionDefinition,
  params: [
    {
      key: "sessionId",
      label: "Session ID",
      type: "string",
      required: true,
      hint: "The agent session to watch (from New Agent Session or the sessions list).",
    },
  ],
  input: ({ sessionId }) => ({
    sessionId,
    sorts: [{ property: "sequence", direction: "descending" }],
    pageSize: 25,
  }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "session_id", type: "string", label: "Session ID" },
    { key: "sequence", type: "number", label: "Sequence" },
    { key: "type", type: "string", label: "Event type" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    "object": "session_event",
    "id": "e1a2b3c4-1111-4222-8333-444455556666",
    "session_id": "5d0e9c2a-2f4b-4a1e-8c3d-9b7a6f5e4d3c",
    "sequence": 3,
    "type": "user.message",
    "created_at": "2026-11-10T08:01:00.000Z",
  },
  maxPages: 1,
});

export default trigger;
