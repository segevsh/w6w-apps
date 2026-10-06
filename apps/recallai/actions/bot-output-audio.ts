import type { ActionDefinition } from "@w6w/types";
import { RecallClient, seg } from "../lib/client.ts";
import { BOT_OUTPUT, idParam } from "../lib/params.ts";

interface Input {
  id: string;
  b64Data: string;
}

/**
 * `POST /api/v1/bot/{id}/output_audio/` — `kind` is `mp3` (the only value) and `b64_data` the
 * base64 of the file. The bot must have been created with `automatic_audio_output` configured.
 */
const botOutputAudio: ActionDefinition<Input> = {
  key: "bot-output-audio",
  type: "perform",
  resource: "bot",
  title: "Output Audio",
  description:
    "Make the bot play an MP3 into the meeting. The bot must have been created with `automatic_audio_output` configured (set it in Other bot settings on Create Bot).",
  idempotent: false,
  params: [
    idParam("Bot ID"),
    {
      key: "b64Data",
      label: "MP3 (base64)",
      type: "text",
      required: true,
      hint: "The base64-encoded bytes of an MP3 file.",
    },
  ],
  output: BOT_OUTPUT,

  execute(input, ctx) {
    return new RecallClient(ctx).request("POST", `/api/v1/bot/${seg(input.id)}/output_audio/`, {
      body: { kind: "mp3", b64_data: input.b64Data },
    });
  },
};

export default botOutputAudio;
