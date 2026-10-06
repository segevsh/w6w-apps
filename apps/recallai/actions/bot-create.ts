import type { ActionDefinition } from "@w6w/types";
import { RecallClient } from "../lib/client.ts";
import { botBody, type BotConfigInput, botConfigParams } from "../lib/bot.ts";
import { BOT_OUTPUT } from "../lib/params.ts";

interface Input extends BotConfigInput {
  meetingUrl: string;
}

/**
 * `POST /api/v1/bot/` — answers 201. Without `join_at` the bot joins immediately (ad hoc); with
 * it, the bot is scheduled (the lead time must be at least ~10 minutes). A 507 means no ad-hoc bot
 * was free: retry after the `Retry-After` the error message carries. Billing runs per bot, so the
 * invocation id is sent as `Idempotency-Key` (honoured for an hour) to make a retry safe.
 */
const botCreate: ActionDefinition<Input> = {
  key: "bot-create",
  type: "perform",
  resource: "bot",
  title: "Create Bot",
  description:
    "Send a bot to a Zoom, Google Meet, Microsoft Teams, Webex or GoTo meeting to record it, now or at a scheduled time. Transcripts, recordings and participant events are read back after the call.",
  idempotent: false,
  params: [
    {
      key: "meetingUrl",
      label: "Meeting URL",
      type: "string",
      required: true,
      hint: "The full join link of the meeting.",
    },
    ...botConfigParams(),
  ],
  output: BOT_OUTPUT,

  execute(input, ctx) {
    return new RecallClient(ctx).request("POST", "/api/v1/bot/", {
      body: { meeting_url: input.meetingUrl, ...botBody(input) },
      idempotent: true,
    });
  },
};

export default botCreate;
