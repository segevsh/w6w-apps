import type { ActionDefinition } from "@w6w/types";
import { CloseClient, compact } from "../lib/client.ts";

interface Input {
  leadId: string;
  direction?: string;
  status?: string;
  duration?: number;
  phone?: string;
  note?: string;
  noteHtml?: string;
  contactId?: string;
  userId?: string;
  activityAt?: string;
  recordingUrl?: string;
  outcomeId?: string;
}

/**
 * `POST /activity/call/` — log a call that happened somewhere else.
 *
 * Close titles this endpoint "Log an external Call activity", and the emphasis
 * is on *log*: it records that a call took place, it does not place one. That is
 * what makes it safe to expose as an ordinary action — unlike the email
 * endpoint, no wire traffic reaches a customer as a side effect. The natural use
 * is syncing a dialer or telephony provider's call records into the CRM
 * timeline.
 *
 * `source` is pinned to `External` rather than exposed as a param. Close's
 * schema allows exactly two values, `"External"` and `"Close.io"` — the latter
 * being a fossil of the close.io -> close.com rename, still spelled the old way
 * on the wire. `Close.io` means "this call was placed through Close's own
 * dialer", which is never true of a call this app is logging after the fact.
 * Letting a caller claim it would misattribute the call in Close's reporting, so
 * the honest value is hard-coded.
 *
 * `duration` is in SECONDS, matching Close's documented convention for duration
 * fields ("Duration values are in seconds").
 *
 * Not idempotent: each call appends another Call activity.
 */
const logCall: ActionDefinition<Input> = {
  key: "log-call",
  type: "perform",
  resource: "activity",
  title: "Log Call",
  description:
    "Record an externally-placed call on a Lead's timeline. Logs history only — it does not " +
    "dial anyone.",
  idempotent: false,
  params: [
    { key: "leadId", label: "Lead ID", type: "string", required: true, placeholder: "lead_..." },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [
        { value: "outbound", label: "Outbound" },
        { value: "inbound", label: "Inbound" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "completed", label: "Completed" },
        { value: "no-answer", label: "No answer" },
        { value: "busy", label: "Busy" },
        { value: "cancel", label: "Cancelled" },
        { value: "failed", label: "Failed" },
        { value: "timeout", label: "Timeout" },
        { value: "created", label: "Created" },
        { value: "in-progress", label: "In progress" },
      ],
      hint: "How the call ended. Close's full documented vocabulary.",
    },
    {
      key: "duration",
      label: "Duration (seconds)",
      type: "number",
      hint: "IN SECONDS, per Close's convention for duration fields.",
      validation: { integer: true, min: 0 },
    },
    {
      key: "phone",
      label: "Phone number",
      type: "string",
      placeholder: "+18004445555",
      hint: "The number dialled or called from, in E.164 form.",
    },
    { key: "note", label: "Note", type: "text", hint: "Plain-text call notes." },
    { key: "noteHtml", label: "Note (HTML)", type: "text", hint: "HTML call notes." },
    { key: "contactId", label: "Contact ID", type: "string", placeholder: "cont_..." },
    {
      key: "userId",
      label: "User ID",
      type: "string",
      placeholder: "user_...",
      hint: "Which rep made or took the call. Defaults to the API key's own user.",
    },
    {
      key: "activityAt",
      label: "Activity at",
      type: "datetime",
      hint: "When the call actually happened. Set it when syncing records after the fact.",
    },
    {
      key: "recordingUrl",
      label: "Recording URL",
      type: "string",
      hint: "Link to the call recording held by your telephony provider.",
    },
    {
      key: "outcomeId",
      label: "Outcome ID",
      type: "string",
      placeholder: "outcome_...",
      hint: "A configured call outcome, from Close's Outcomes settings.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Activity ID" }],

  execute(input, ctx) {
    return new CloseClient(ctx).request("/activity/call/", {
      method: "POST",
      body: compact({
        lead_id: input.leadId,
        // Pinned: the only other documented value, "Close.io", asserts the call
        // went through Close's own dialer, which is untrue for a logged call.
        source: "External",
        direction: input.direction,
        status: input.status,
        duration: input.duration,
        phone: input.phone,
        note: input.note,
        note_html: input.noteHtml,
        contact_id: input.contactId,
        user_id: input.userId,
        activity_at: input.activityAt,
        recording_url: input.recordingUrl,
        outcome_id: input.outcomeId,
      }),
    });
  },
};

export default logCall;
