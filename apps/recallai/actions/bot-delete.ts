import type { ActionDefinition } from "@w6w/types";
import { RecallClient, seg } from "../lib/client.ts";
import { DELETED_OUTPUT, idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `DELETE /api/v1/bot/{id}/` — answers 204 with no body. */
const action: ActionDefinition<Input> = {
  key: "bot-delete",
  type: "perform",
  resource: "bot",
  title: "Delete Scheduled Bot",
  description:
    "Delete a bot that has not joined a call yet. A bot already dispatched answers 405; use Remove Bot From Call instead.",
  idempotent: true,
  params: [idParam("Bot ID")],
  output: DELETED_OUTPUT,

  async execute(input, ctx) {
    await new RecallClient(ctx).request("DELETE", `/api/v1/bot/${seg(input.id)}/`);
    return { deleted: true, id: input.id };
  },
};

export default action;
