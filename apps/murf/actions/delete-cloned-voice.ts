import type { ActionDefinition } from "@w6w/types";
import { MurfClient } from "../lib/client.ts";

interface Input {
  voiceId: string;
}

const deleteClonedVoice: ActionDefinition<Input> = {
  key: "delete-cloned-voice",
  type: "perform",
  resource: "voice",
  title: "Delete Cloned Voice",
  description:
    "Permanently delete a cloned voice from the workspace (DELETE /v1/speech/voices/cloned/{voiceId}). Not reversible. A voice that is already gone is a 404 and fails the action.",
  idempotent: false,
  params: [
    {
      key: "voiceId",
      label: "Cloned voice ID",
      type: "string",
      required: true,
      placeholder: "cln_...",
    },
  ],
  output: [
    { key: "responseCode", type: "string", label: "Result code" },
    { key: "responseMessage", type: "string", label: "Result message" },
  ],

  async execute(input, ctx) {
    if (!input.voiceId?.trim()) throw new Error("voiceId is required");
    return await new MurfClient(ctx).call(
      `/v1/speech/voices/cloned/${encodeURIComponent(input.voiceId.trim())}`,
      { method: "DELETE" },
    );
  },
};

export default deleteClonedVoice;
