import type { ActionDefinition } from "@w6w/types";
import { RecallClient, seg } from "../lib/client.ts";
import { type BotConfigInput, botConfigParams, recordingConfig } from "../lib/bot.ts";
import { BOT_OUTPUT, idParam } from "../lib/params.ts";

interface Input extends
  Pick<
    BotConfigInput,
    "transcriptProvider" | "transcriptLanguage" | "recordingConfig"
  > {
  id: string;
}

const shared = botConfigParams().filter((p) =>
  ["transcriptProvider", "transcriptLanguage", "recordingConfig"].includes(p.key)
);

/**
 * `POST /api/v1/bot/{id}/start_recording/` — the body is optional and is a recording config
 * (`transcript`, `video_mixed_mp4`, ...). Per the reference, this RESTARTS the current recording
 * if one is already in progress.
 */
const botStartRecording: ActionDefinition<Input> = {
  key: "bot-start-recording",
  type: "perform",
  resource: "bot",
  title: "Start Bot Recording",
  description:
    "Instruct a bot already in the call to start recording, optionally with its own recording config. Restarts the current recording if one is in progress.",
  idempotent: false,
  params: [idParam("Bot ID"), ...shared],
  output: BOT_OUTPUT,

  execute(input, ctx) {
    return new RecallClient(ctx).request("POST", `/api/v1/bot/${seg(input.id)}/start_recording/`, {
      body: recordingConfig(input),
    });
  },
};

export default botStartRecording;
