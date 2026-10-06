import type { ActionDefinition } from "@w6w/types";
import { RecallClient, seg } from "../lib/client.ts";
import { BOT_OUTPUT, idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `POST /api/v1/bot/{id}/leave_call/` — no request body; answers the updated bot. */
const action: ActionDefinition<Input> = {
  key: "bot-leave-call",
  type: "perform",
  resource: "bot",
  title: "Remove Bot From Call",
  description:
    "Remove the bot from the meeting. Irreversible: the bot leaves and processes what it recorded. Fails with `cannot_command_completed_bot` or `cannot_command_unstarted_bot` when the bot is not in a call.",
  idempotent: false,
  params: [idParam("Bot ID")],
  output: BOT_OUTPUT,

  execute(input, ctx) {
    return new RecallClient(ctx).request("POST", `/api/v1/bot/${seg(input.id)}/leave_call/`);
  },
};

export default action;
