import type { ActionDefinition } from "@w6w/types";
import { RecallClient, seg } from "../lib/client.ts";
import { botBody, type BotConfigInput, botConfigParams } from "../lib/bot.ts";
import { CALENDAR_EVENT_OUTPUT, idParam } from "../lib/params.ts";

interface Input extends Omit<BotConfigInput, "joinAt"> {
  id: string;
  deduplicationKey: string;
}

/**
 * `POST /api/v2/calendar-events/{id}/bot/` — both `deduplication_key` and `bot_config` are
 * required. The bot joins when the event starts, so `join_at` is not part of `bot_config` here.
 * Calling it again with the same key updates the scheduled bot; events that share a key share one
 * bot. Answers the updated calendar event.
 */
const calendarEventScheduleBot: ActionDefinition<Input> = {
  key: "calendar-event-schedule-bot",
  type: "perform",
  resource: "calendar",
  title: "Schedule Bot for Calendar Event",
  description:
    "Schedule a bot to join a calendar event when it starts, or update the bot already scheduled for it. Events sharing a deduplication key share one bot.",
  idempotent: true,
  params: [
    idParam("Calendar event ID"),
    {
      key: "deduplicationKey",
      label: "Deduplication key",
      type: "string",
      required: true,
      hint:
        "Events with the same key get one bot between them, e.g. the meeting URL or an iCal UID.",
    },
    ...botConfigParams().filter((p) => p.key !== "joinAt"),
  ],
  output: CALENDAR_EVENT_OUTPUT,

  execute(input, ctx) {
    return new RecallClient(ctx).request("POST", `/api/v2/calendar-events/${seg(input.id)}/bot/`, {
      body: { deduplication_key: input.deduplicationKey, bot_config: botBody(input) },
      idempotent: true,
    });
  },
};

export default calendarEventScheduleBot;
