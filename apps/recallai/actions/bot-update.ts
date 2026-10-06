import type { ActionDefinition } from "@w6w/types";
import { compact, RecallClient, seg } from "../lib/client.ts";
import { botBody, type BotConfigInput, botConfigParams } from "../lib/bot.ts";
import { BOT_OUTPUT, idParam } from "../lib/params.ts";

interface Input extends BotConfigInput {
  id: string;
  meetingUrl?: string;
}

/**
 * `PATCH /api/v1/bot/{id}/` — only a SCHEDULED bot that has not been dispatched can be updated
 * (`update_bot_failed`: "Only non-dispatched bots can be updated"), and a `join_at` closer than
 * ~10 minutes is refused ("Not enough time to launch new bot"). Delete it and create an ad-hoc
 * bot instead.
 */
const botUpdate: ActionDefinition<Input> = {
  key: "bot-update",
  type: "perform",
  resource: "bot",
  title: "Update Scheduled Bot",
  description:
    "Change a scheduled bot's meeting URL, name, join time, recording config or metadata before it joins the call.",
  idempotent: true,
  params: [
    idParam("Bot ID"),
    {
      key: "meetingUrl",
      label: "Meeting URL",
      type: "string",
      hint: "Leave empty to keep the current one.",
    },
    ...botConfigParams(),
  ],
  output: BOT_OUTPUT,

  execute(input, ctx) {
    return new RecallClient(ctx).request("PATCH", `/api/v1/bot/${seg(input.id)}/`, {
      body: { ...compact({ meeting_url: input.meetingUrl }), ...botBody(input) },
      idempotent: true,
    });
  },
};

export default botUpdate;
