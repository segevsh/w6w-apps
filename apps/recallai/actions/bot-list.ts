import type { ActionDefinition } from "@w6w/types";
import { RecallClient } from "../lib/client.ts";

interface Input {
  joinAtAfter?: string;
  joinAtBefore?: string;
  meetingUrl?: string;
  platform?: string;
  status?: string;
  metadataKey?: string;
  metadataValue?: string;
  page?: number;
}

const PLATFORMS = [
  "zoom",
  "google_meet",
  "microsoft_teams",
  "microsoft_teams_live",
  "webex",
  "goto_meeting",
  "zoom_rtms",
  "google_meet_media_api",
  "chime_sdk",
  "slack_authenticator",
  "slack_huddle_observer",
];

const STATUSES = [
  "ready",
  "joining_call",
  "in_waiting_room",
  "in_call_not_recording",
  "recording_permission_allowed",
  "recording_permission_denied",
  "in_call_recording",
  "call_ended",
  "recording_done",
  "analysis_done",
  "analysis_failed",
  "done",
  "fatal",
  "media_expired",
];

/**
 * `GET /api/v1/bot/` — offset-paginated (`count`, `next`, `previous`, `page`), unlike every other
 * list, which uses a cursor. `platform` and `status` are multi-valued; this takes one of each.
 * Recall asks callers NOT to poll this for status changes (use the status-change webhooks).
 */
const botList: ActionDefinition<Input> = {
  key: "bot-list",
  type: "search",
  resource: "bot",
  title: "List Bots",
  description:
    "List bots in the workspace, filtered by join window, meeting URL, platform, status or a metadata key. Not for polling a bot's status: use Recall's status-change webhooks for that.",
  params: [
    {
      key: "joinAtAfter",
      label: "Joins on or after",
      type: "date",
      hint: "YYYY-MM-DD. Find bots scheduled in a window.",
    },
    { key: "joinAtBefore", label: "Joins on or before", type: "date", hint: "YYYY-MM-DD." },
    { key: "meetingUrl", label: "Meeting URL", type: "string" },
    {
      key: "platform",
      label: "Platform",
      type: "select",
      options: PLATFORMS.map((value) => ({ value, label: value })),
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: STATUSES.map((value) => ({ value, label: value })),
    },
    {
      key: "metadataKey",
      label: "Metadata key",
      type: "string",
      hint: "With Metadata value, filters on `metadata.<key> = <value>`.",
    },
    { key: "metadataValue", label: "Metadata value", type: "string" },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "The `nextPage` from the previous result; starts at 1.",
      validation: { min: 1, integer: true },
    },
  ],
  output: [
    { key: "bots", type: "array", label: "Bots on this page" },
    { key: "count", type: "number", label: "Total bots matching" },
    { key: "nextPage", type: "number", label: "Page number of the next page; absent on the last" },
  ],

  async execute(input, ctx) {
    const metadata = input.metadataKey && input.metadataValue !== undefined
      ? { [`metadata__${input.metadataKey}`]: input.metadataValue }
      : {};
    const { items, count, nextPage } = await new RecallClient(ctx).list("/api/v1/bot/", {
      query: {
        join_at_after: input.joinAtAfter,
        join_at_before: input.joinAtBefore,
        meeting_url: input.meetingUrl,
        platform: input.platform,
        status: input.status,
        page: input.page,
        ...metadata,
      },
    });
    return {
      bots: items,
      ...(count !== undefined ? { count } : {}),
      ...(nextPage !== undefined ? { nextPage } : {}),
    };
  },
};

export default botList;
