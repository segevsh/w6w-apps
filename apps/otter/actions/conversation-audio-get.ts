import type { ActionDefinition } from "@w6w/types";
import { OtterClient, type OtterMeta } from "../lib/client.ts";

interface Input {
  id: string;
}

interface Output {
  meta: OtterMeta;
  data: { url: string };
}

const conversationAudioGet: ActionDefinition<Input, Output> = {
  key: "conversation-audio-get",
  type: "read",
  resource: "conversation",
  title: "Get Conversation Audio URL",
  description: "Get the MP3 audio download link for a specific conversation.",
  params: [
    { key: "id", label: "Conversation ID", type: "string", required: true },
  ],
  output: [
    { key: "data.url", type: "string", label: "Audio download URL" },
  ],

  execute(input, ctx) {
    return new OtterClient(ctx).get<Output>(
      `/conversations/${encodeURIComponent(input.id)}/audio`,
    );
  },
};

export default conversationAudioGet;
