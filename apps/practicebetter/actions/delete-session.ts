import type { ActionDefinition } from "@w6w/types";
import { encodeId, PracticeBetterClient } from "../lib/client.ts";

/**
 * `DELETE /consultant/sessions/{sessionId}` — delete a session.
 *
 * Security: `[read, write]`. The document declares no response body
 * (`200`/`202`), so the action reports the status it got.
 *
 * Deleting is not cancelling: this removes the session from the schedule
 * outright, where `cancel-session` keeps it and records why. Idempotent in the
 * sense the runtime cares about — a retry cannot delete a second session — the
 * second call may answer `404`, which is surfaced rather than swallowed.
 */
interface Input {
  sessionId: string;
}

const deleteSession: ActionDefinition<Input, { status: number }> = {
  key: "delete-session",
  type: "perform",
  resource: "session",
  title: "Delete Session",
  description:
    "Delete a session from the schedule. Returns the HTTP status; the endpoint has no response " +
    "body. Use `cancel-session` instead if the session should remain visible as cancelled.",
  idempotent: true,
  params: [
    {
      key: "sessionId",
      label: "Session ID",
      type: "string",
      required: true,
      hint: "The session's `id`.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new PracticeBetterClient(ctx).status(
      `/consultant/sessions/${encodeId(input.sessionId)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default deleteSession;
