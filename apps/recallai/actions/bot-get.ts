import type { ActionDefinition } from "@w6w/types";
import { RecallClient, seg } from "../lib/client.ts";
import { BOT_OUTPUT, idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `GET /api/v1/bot/{id}/`. */
const action: ActionDefinition<Input> = {
  key: "bot-get",
  type: "read",
  resource: "bot",
  title: "Get Bot",
  description:
    "Retrieve a bot: its status history, recordings and the media shortcuts (transcript, video, audio) with their download URLs once ready.",
  params: [idParam("Bot ID")],
  output: BOT_OUTPUT,

  execute(input, ctx) {
    return new RecallClient(ctx).request("GET", `/api/v1/bot/${seg(input.id)}/`);
  },
};

export default action;
