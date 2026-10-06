import type { ActionDefinition } from "@w6w/types";
import { AvomaClient } from "../lib/client.ts";

/**
 * `POST /v1/calls/` (operationId `createExtCall`) — hand Avoma a call recording to process.
 *
 * Required by the spec: `external_id`, `user_email`, `frm`, `to`, `start_at`,
 * `recording_url`, `direction`, `source`, `participants`. Avoma downloads `recording_url`
 * itself, so it must be publicly fetchable. The user's licence is consumed to process it.
 *
 * Not offered: `additional_details` (the schema types it as a string but its description
 * says "a JSON object" — unverifiable), and the read-only `meeting` / `organization` blobs.
 */
interface Participant {
  email?: string;
  name?: string;
  crm_association?: { crm_obj_id?: string; crm_obj_type?: string };
}

interface Input {
  externalId: string;
  userEmail: string;
  frm: string;
  to: string;
  startAt: string;
  recordingUrl: string;
  direction: string;
  source: string;
  participants: Participant[] | string;
  endAt?: string;
  frmName?: string;
  toName?: string;
  answered?: boolean;
  isVoicemail?: boolean;
}

function parseParticipants(v: Input["participants"]): Participant[] {
  let parsed: unknown = v;
  if (typeof v === "string") {
    try {
      parsed = JSON.parse(v);
    } catch {
      throw new Error("participants is not valid JSON");
    }
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("participants must be a non-empty JSON array");
  }
  return parsed as Participant[];
}

const callCreate: ActionDefinition<Input> = {
  key: "call-create",
  type: "perform",
  resource: "call",
  title: "Create Call",
  description: "Submit a call recording from your own dialer to Avoma for transcription and " +
    "analysis.",
  idempotent: false,
  params: [
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      required: true,
      hint: "Your unique id for the call (from the dialer: HubSpot, Twilio, Zoom, …).",
    },
    {
      key: "userEmail",
      label: "Avoma user email",
      type: "string",
      required: true,
      hint: "The Avoma user who made or received the call. Their licence is used.",
    },
    { key: "frm", label: "From number", type: "string", required: true },
    { key: "to", label: "To number", type: "string", required: true },
    { key: "startAt", label: "Start", type: "datetime", required: true },
    { key: "endAt", label: "End", type: "datetime" },
    {
      key: "recordingUrl",
      label: "Recording URL",
      type: "string",
      required: true,
      hint: "Must be publicly fetchable — Avoma downloads it for processing.",
    },
    {
      key: "direction",
      label: "Direction",
      type: "string",
      required: true,
      hint: "Inbound or Outbound (Avoma's own examples).",
    },
    {
      key: "source",
      label: "Source",
      type: "string",
      required: true,
      hint: "Lowercase dialer name: zoom, zoomphone, twilio, phoneburner, ringcentral, aircall, …",
    },
    {
      key: "participants",
      label: "Participants",
      type: "json",
      required: true,
      hint: 'JSON array of {"email","name"} objects. The first entry must be the prospect or ' +
        "lead the call was with.",
    },
    { key: "frmName", label: "Caller name", type: "string" },
    { key: "toName", label: "Callee name", type: "string" },
    { key: "answered", type: "boolean", label: "Answered" },
    { key: "isVoicemail", type: "boolean", label: "Is voicemail" },
  ],
  output: [
    { key: "external_id", type: "string", label: "External ID" },
    { key: "start_at", type: "string", label: "Start (UTC)" },
    { key: "meeting", type: "object", label: "Meeting Avoma created for the call" },
  ],

  execute(input, ctx) {
    const body = {
      external_id: input.externalId,
      user_email: input.userEmail,
      frm: input.frm,
      to: input.to,
      start_at: input.startAt,
      end_at: input.endAt || undefined,
      recording_url: input.recordingUrl,
      direction: input.direction,
      source: input.source,
      participants: parseParticipants(input.participants),
      frm_name: input.frmName || undefined,
      to_name: input.toName || undefined,
      answered: input.answered,
      is_voicemail: input.isVoicemail,
    };
    return new AvomaClient(ctx).request("/v1/calls/", { method: "POST", body });
  },
};

export default callCreate;
