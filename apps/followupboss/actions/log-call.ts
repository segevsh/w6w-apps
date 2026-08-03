import type { ActionDefinition } from "@w6w/types";
import { CALL_OUTCOMES, compact, FubClient, optionsFrom } from "../lib/client.ts";

interface Input {
  personId: number;
  phone: string;
  isIncoming: boolean;
  note?: string;
  outcome?: string;
  duration?: number;
  toNumber?: string;
  fromNumber?: string;
  userId?: number;
  recordingUrl?: string;
}

/**
 * `POST /calls` — log a call against a contact.
 *
 * Three fields are required by the schema — `personId`, `phone` and
 * `isIncoming` — and the third is the interesting one: it is a required
 * *boolean*, so there is no "unknown direction". A call must be recorded as
 * inbound or outbound.
 *
 * `userId` carries a permission rule stated in its own description: "This can
 * only be set by administrators, otherwise the currently logged in user's ID is
 * used." So an agent's key silently logs the call as their own regardless of
 * what is passed — worth knowing before building a shared call-logging pipe on
 * an agent credential.
 *
 * `phone` versus `toNumber`/`fromNumber`: `phone` is the required "the number
 * this call was made to or from", and the directional pair is optional detail
 * on top. Sending just `phone` is complete and correct.
 */
const logCall: ActionDefinition<Input> = {
  key: "log-call",
  type: "perform",
  resource: "call",
  title: "Log Call",
  idempotent: false,
  description:
    "Record a call against a contact, with outcome, duration, notes and an optional recording URL.",
  params: [
    {
      key: "personId",
      label: "Person id",
      type: "number",
      required: true,
      hint: "The contact this call was with.",
    },
    {
      key: "phone",
      label: "Phone",
      type: "string",
      required: true,
      hint: "The number the call was made to or from.",
    },
    {
      key: "isIncoming",
      label: "Incoming",
      type: "boolean",
      required: true,
      hint: "Required — the API has no 'unknown direction'. On for inbound, off for outbound.",
    },
    {
      key: "outcome",
      label: "Outcome",
      type: "select",
      options: optionsFrom(CALL_OUTCOMES),
      hint: "How the call went.",
    },
    { key: "note", label: "Note", type: "text", hint: "The log message for this call." },
    { key: "duration", label: "Duration (seconds)", type: "number", hint: "Length of the call." },
    {
      key: "recordingUrl",
      label: "Recording URL",
      type: "string",
      advanced: true,
      hint: "Link to the call recording.",
    },
    {
      key: "toNumber",
      label: "To number",
      type: "string",
      advanced: true,
      hint: "The number called, when you want to record both ends explicitly.",
    },
    {
      key: "fromNumber",
      label: "From number",
      type: "string",
      advanced: true,
      hint: "The number called from.",
    },
    {
      key: "userId",
      label: "User id",
      type: "number",
      advanced: true,
      hint: "Which agent made or received the call. **Only an administrator's key can set this** " +
        "— with an agent's key the call is attributed to that agent whatever you send.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Call id" }],

  execute(input, ctx) {
    return new FubClient(ctx).request("/calls", {
      method: "POST",
      body: compact({
        personId: input.personId,
        phone: input.phone,
        isIncoming: input.isIncoming,
        note: input.note,
        outcome: input.outcome,
        duration: input.duration,
        toNumber: input.toNumber,
        fromNumber: input.fromNumber,
        userId: input.userId,
        recordingUrl: input.recordingUrl,
      }),
    });
  },
};

export default logCall;
