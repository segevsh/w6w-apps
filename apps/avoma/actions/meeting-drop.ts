import type { ActionDefinition } from "@w6w/types";
import { AvomaClient } from "../lib/client.ts";
import { seg } from "../lib/params.ts";

/**
 * `POST /v1/meetings/{uuid}/drop/` — make Avoma's bot leave a meeting.
 *
 * The bot must currently be in the meeting. Answers 202 `{message}`; 400/403/406 carry the
 * reason, which surfaces in the thrown error.
 */
interface Input {
  meetingUuid: string;
}

const meetingDrop: ActionDefinition<Input> = {
  key: "meeting-drop",
  type: "perform",
  resource: "meeting",
  title: "Drop Meeting",
  description: "Remove Avoma's notetaker bot from a meeting it is currently attending.",
  idempotent: false,
  params: [{
    key: "meetingUuid",
    label: "Meeting UUID",
    type: "string",
    required: true,
    hint: "The bot must be in the meeting right now.",
  }],
  output: [{ key: "message", type: "string", label: "Avoma's confirmation message" }],

  execute(input, ctx) {
    return new AvomaClient(ctx).request(
      `/v1/meetings/${seg(input.meetingUuid, "meetingUuid")}/drop/`,
      { method: "POST" },
    );
  },
};

export default meetingDrop;
