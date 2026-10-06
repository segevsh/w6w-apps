import type { ActionDefinition } from "@w6w/types";
import { MurfClient } from "../lib/client.ts";

interface Input {
  requestId: string;
}

const getVoiceCloneStatus: ActionDefinition<Input> = {
  key: "get-voice-clone-status",
  type: "read",
  resource: "voice",
  title: "Get Voice Clone Status",
  description:
    "Poll a voice clone creation (GET /v1/speech/voice-clone-creation-status/{requestId}) until `status` is COMPLETED (then `voiceId`, prefix cln_, is set) or FAILED (then `errorMessage`). The request ID comes from Murf's Create Voice Clone, which needs an audio file upload and is not covered by this app.",
  params: [{ key: "requestId", label: "Request ID", type: "string", required: true }],
  output: [
    { key: "requestId", type: "string", label: "Request ID" },
    { key: "status", type: "string", label: "QUEUED, PROCESSING, COMPLETED or FAILED" },
    { key: "voiceId", type: "string", label: "Cloned voice ID (when COMPLETED)" },
    { key: "errorMessage", type: "string", label: "Failure reason (when FAILED)" },
    { key: "responseCode", type: "string", label: "Result code" },
    { key: "responseMessage", type: "string", label: "Result message" },
  ],

  async execute(input, ctx) {
    if (!input.requestId?.trim()) throw new Error("requestId is required");
    return await new MurfClient(ctx).call(
      `/v1/speech/voice-clone-creation-status/${encodeURIComponent(input.requestId.trim())}`,
    );
  },
};

export default getVoiceCloneStatus;
