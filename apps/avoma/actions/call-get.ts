import type { ActionDefinition } from "@w6w/types";
import { AvomaClient } from "../lib/client.ts";
import { seg } from "../lib/params.ts";

/** `GET /v1/calls/{external_id}/` — addressed by the dialer's id, NOT an Avoma uuid. */
interface Input {
  externalId: string;
}

const callGet: ActionDefinition<Input> = {
  key: "call-get",
  type: "read",
  resource: "call",
  title: "Get Call",
  description: "Fetch one call by the external id its dialer (or you) supplied.",
  params: [{
    key: "externalId",
    label: "External ID",
    type: "string",
    required: true,
    hint: "The dialer's own call id (the `external_id` field), not an Avoma UUID.",
  }],
  output: [
    { key: "external_id", type: "string", label: "External ID" },
    { key: "direction", type: "string", label: "Direction" },
    { key: "frm", type: "string", label: "From number" },
    { key: "to", type: "string", label: "To number" },
    { key: "start_at", type: "string", label: "Start (UTC)" },
    { key: "end_at", type: "string", label: "End (UTC)" },
    { key: "answered", type: "boolean", label: "Answered" },
    { key: "is_voicemail", type: "boolean", label: "Is voicemail" },
    { key: "participants", type: "array", label: "Participants" },
    { key: "user_email", type: "string", label: "Avoma user email" },
    { key: "recording_url", type: "string", label: "Recording URL" },
    { key: "meeting", type: "object", label: "Linked meeting" },
  ],

  execute(input, ctx) {
    return new AvomaClient(ctx).get(`/v1/calls/${seg(input.externalId, "externalId")}/`);
  },
};

export default callGet;
