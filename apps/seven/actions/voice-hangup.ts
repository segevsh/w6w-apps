import type { ActionDefinition } from "@w6w/types";
import { encodeId, SevenClient } from "../lib/client.ts";

/** `POST /api/voice/:call_id/hangup` — only calls with status `in-progress` can be ended. */
interface Input {
  call_id: string;
}

const voiceHangup: ActionDefinition<Input> = {
  key: "voice-hangup",
  type: "perform",
  resource: "voice",
  title: "End Voice Call",
  description: "End an active voice call. Only calls in the in-progress state can be ended.",
  idempotent: true,
  params: [
    {
      key: "call_id",
      label: "Call ID",
      type: "string",
      required: true,
      hint: "The id from Send Voice Call's messages entry.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call was ended" },
    { key: "error", type: "string", label: "Error text, if any" },
  ],

  execute(input, ctx) {
    return new SevenClient(ctx).request("POST", `/voice/${encodeId(input.call_id)}/hangup`);
  },
};

export default voiceHangup;
