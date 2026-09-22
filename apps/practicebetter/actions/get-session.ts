import type { ActionDefinition } from "@w6w/types";
import { encodeId, PracticeBetterClient } from "../lib/client.ts";

/**
 * `GET /consultant/sessions/{sessionId}` — read one session.
 *
 * Security: `[read]`.
 *
 * The response is the rich `ClientSession` object: scheduling data
 * (`sessionDate`, `duration`, `endDate`, `timeZone`), the participants
 * (`clientRecord`, `consultant`), the delivery shape (`location`,
 * `telehealthSettings`), status (`confirmationStatus`, `cancelled`) and the
 * practitioner's `notes`. The ten fields declared in `output` are the ones a
 * follow-up step keys off; the rest passes through untouched.
 *
 * `recordId` matters only for group sessions: a group session has enrollees
 * rather than one client, and the optional query parameter scopes the response
 * to a single enrollee's view of it. Leave it empty for the session as a whole.
 */
interface Input {
  sessionId: string;
  recordId?: string;
}

const getSession: ActionDefinition<Input, Record<string, unknown>> = {
  key: "get-session",
  type: "read",
  resource: "session",
  title: "Get Session",
  description:
    "Read one session by id: its schedule, participants, location and confirmation status. Pass " +
    "`recordId` to scope a group session to one enrollee.",
  params: [
    {
      key: "sessionId",
      label: "Session ID",
      type: "string",
      required: true,
      hint: "The session's `id`. Use `list-sessions` to find it.",
    },
    {
      key: "recordId",
      label: "Client record ID",
      type: "string",
      hint: "Only meaningful for a group session: scope the response to this enrollee's record.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Session ID" },
    { key: "clientRecord", type: "object", label: "The client record the session belongs to" },
    { key: "consultant", type: "object", label: "The consultant delivering it" },
    { key: "dateCreated", type: "string", label: "Created at" },
    { key: "duration", type: "number", label: "Duration in minutes" },
    { key: "endDate", type: "string", label: "End time" },
    { key: "confirmationStatus", type: "string", label: "Confirmation status" },
    { key: "cancelled", type: "boolean", label: "Cancelled" },
    { key: "location", type: "object", label: "Office location, for an in-person session" },
    { key: "notes", type: "string", label: "Notes" },
  ],

  execute(input, ctx) {
    return new PracticeBetterClient(ctx).request(
      `/consultant/sessions/${encodeId(input.sessionId)}`,
      { query: { recordId: input.recordId } },
    );
  },
};

export default getSession;
