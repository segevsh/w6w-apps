import type { ActionDefinition } from "@w6w/types";
import { RecallClient, seg } from "../lib/client.ts";
import { BOT_OUTPUT, idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `POST /api/v1/bot/{id}/delete_media/` — no request body; answers the updated bot. */
const action: ActionDefinition<Input> = {
  key: "bot-delete-media",
  type: "perform",
  resource: "bot",
  title: "Delete Bot Media",
  description:
    "Delete the media Recall stored for this bot (recordings, transcripts, participant events). Irreversible. Returns the bot.",
  idempotent: false,
  params: [idParam("Bot ID")],
  output: BOT_OUTPUT,

  execute(input, ctx) {
    return new RecallClient(ctx).request("POST", `/api/v1/bot/${seg(input.id)}/delete_media/`);
  },
};

export default action;
