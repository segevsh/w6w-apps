import type { ActionDefinition } from "@w6w/types";
import { encodeId, PracticeBetterClient } from "../lib/client.ts";

/**
 * `POST /consultant/sessions/{sessionId}/cancel` — cancel a booked session.
 *
 * Security: `[read, write]`. The body is entirely optional, and the document
 * declares no response schema (`200`/`202`), so the action reports the status it
 * got.
 *
 * The four body fields are the cancellation's blast radius, and two of them are
 * worth understanding before a retry:
 *
 *  - `cancelPendingBookings` also cancels this session's pending bookings;
 *  - `cancelRecurringAutomations` also stops the recurring automations attached
 *    to it.
 *
 * Idempotent in the sense the runtime cares about: a second cancel lands on the
 * already-cancelled session. It is not free, however — `notify` re-notifies on
 * every call, which is why the action's hint says so rather than implying a
 * retry is silent.
 */
interface Input {
  sessionId: string;
  notify?: boolean;
  notes?: string;
  cancelPendingBookings?: boolean;
  cancelRecurringAutomations?: boolean;
}

const cancelSession: ActionDefinition<Input, { status: number }> = {
  key: "cancel-session",
  type: "perform",
  resource: "session",
  title: "Cancel Session",
  description:
    "Cancel a session, optionally notifying the client and cascading to its pending bookings and " +
    "recurring automations.",
  idempotent: true,
  params: [
    {
      key: "sessionId",
      label: "Session ID",
      type: "string",
      required: true,
      hint: "The session's `id`.",
    },
    {
      key: "notify",
      label: "Notify the client",
      type: "boolean",
      hint: "Send the client a cancellation notice. Remember that a repeat call notifies again.",
    },
    {
      key: "notes",
      label: "Notes",
      type: "string",
      hint: "Reason or note recorded against the cancellation.",
    },
    {
      key: "cancelPendingBookings",
      label: "Cancel pending bookings",
      type: "boolean",
      hint: "Also cancel this session's pending bookings.",
    },
    {
      key: "cancelRecurringAutomations",
      label: "Cancel recurring automations",
      type: "boolean",
      hint: "Also cancel the recurring automations attached to this session.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new PracticeBetterClient(ctx).status(
      `/consultant/sessions/${encodeId(input.sessionId)}/cancel`,
      {
        method: "POST",
        body: {
          notify: input.notify,
          notes: input.notes,
          cancelPendingBookings: input.cancelPendingBookings,
          cancelRecurringAutomations: input.cancelRecurringAutomations,
        },
      },
    );
    return { status };
  },
};

export default cancelSession;
