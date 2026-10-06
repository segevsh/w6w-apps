import type { ActionDefinition } from "@w6w/types";
import { RingoverClient, seg } from "../lib/client.ts";

interface Input {
  callId: string;
}

const transcriptionGet: ActionDefinition<Input> = {
  key: "transcription-get",
  type: "read",
  resource: "call",
  title: "Get Call Transcription",
  description:
    "Fetch the transcription of one call (speeches per channel, status). Needs the transcription feature on the team plan.",
  params: [
    { key: "callId", label: "Call ID", type: "string", required: true },
  ],
  output: [
    { key: "transcriptions", type: "array", label: "Transcriptions" },
  ],

  async execute(input, ctx) {
    const body = await new RingoverClient(ctx).request<unknown>(
      "GET",
      `/transcriptions/${seg(input.callId)}`,
    );
    return { transcriptions: Array.isArray(body) ? body : [] };
  },
};

export default transcriptionGet;
