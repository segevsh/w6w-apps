import type { ActionDefinition } from "@w6w/types";
import { RecallClient, seg } from "../lib/client.ts";
import { BOT_OUTPUT, idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `POST /api/v1/bot/{id}/resume_recording/` — no request body; answers the updated bot. */
const action: ActionDefinition<Input> = {
  key: "bot-resume-recording",
  type: "perform",
  resource: "bot",
  title: "Resume Bot Recording",
  description: "Resume a paused recording.",
  idempotent: false,
  params: [idParam("Bot ID")],
  output: BOT_OUTPUT,

  execute(input, ctx) {
    return new RecallClient(ctx).request("POST", `/api/v1/bot/${seg(input.id)}/resume_recording/`);
  },
};

export default action;
