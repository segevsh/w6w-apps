import type { ActionDefinition } from "@w6w/types";
import { RecallClient, seg } from "../lib/client.ts";
import { BOT_OUTPUT, idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `POST /api/v1/bot/{id}/pause_recording/` — no request body; answers the updated bot. */
const action: ActionDefinition<Input> = {
  key: "bot-pause-recording",
  type: "perform",
  resource: "bot",
  title: "Pause Bot Recording",
  description: "Pause the bot's current recording.",
  idempotent: false,
  params: [idParam("Bot ID")],
  output: BOT_OUTPUT,

  execute(input, ctx) {
    return new RecallClient(ctx).request("POST", `/api/v1/bot/${seg(input.id)}/pause_recording/`);
  },
};

export default action;
