import type { ActionDefinition } from "@w6w/types";
import { BufferClient, compact, idList, unset } from "../lib/client.ts";

/**
 * `query dailyPostingLimits(input: DailyPostingLimitsInput!)` — how much room
 * is left on each channel today.
 *
 * This is the check to run *before* `post-create` in any workflow that posts in
 * bulk. Buffer meters posting per channel per day on top of the API rate limit,
 * and the two are unrelated: having API calls left says nothing about having
 * post slots left. When a channel is at its cap, `createPost` fails with a
 * `LimitReachedError` arm — HTTP 200, inside `data`, which is exactly the
 * failure mode that gets mistaken for success (see `lib/client.ts`).
 *
 * The response is one row per channel: `{ channelId, sent, scheduled, limit,
 * isAtLimit }` — so a workflow can branch on `isAtLimit` rather than deriving
 * it, and can see whether the cap was consumed by posts already sent or by ones
 * still queued.
 *
 * Two constraints on the input, both from Buffer:
 *
 *  - `channelIds` is **required** and non-null — there is no "all channels"
 *    form. Feed it from `channel-list`.
 *  - *"All channels must belong to the same organization."* Mixing them is a
 *    server-side rejection, not something this action can pre-empt without an
 *    extra round trip it would be making on every call.
 *
 * `date` defaults to today if omitted. It exists so a workflow can look ahead
 * before scheduling into a future day.
 *
 * Note that this is one of the few Buffer limits a draft escapes: Buffer says
 * of `saveToDraft` that *"Posting limits are not checked"* on drafts. So a run
 * that is at its cap can still park content and schedule it tomorrow.
 */
const DAILY_LIMITS = `query W6wDailyPostingLimits($input: DailyPostingLimitsInput!) {
  dailyPostingLimits(input: $input) {
    channelId
    sent
    scheduled
    limit
    isAtLimit
  }
}`;

interface Input {
  channelIds: string;
  date?: string;
}

const dailyPostingLimitList: ActionDefinition<Input> = {
  key: "daily-posting-limit-list",
  type: "read",
  resource: "channel",
  title: "Get Daily Posting Limits",
  description:
    "Per-channel posting headroom for a day — sent, scheduled, the cap, and whether the " +
    "channel is already at it. Run before bulk scheduling; hitting the cap fails a post.",
  params: [
    {
      key: "channelIds",
      label: "Channel IDs",
      type: "string",
      required: true,
      hint: "Comma-separated, and all from the **same organization** — Buffer rejects a mixed " +
        "set. There is no all-channels form.",
    },
    {
      key: "date",
      label: "Date",
      type: "datetime",
      hint: "Defaults to today. Set it to look ahead before scheduling into a future day.",
    },
  ],
  output: [
    { key: "dailyPostingLimits", type: "array", label: "Limit rows" },
    { key: "dailyPostingLimits[].channelId", type: "string", label: "Channel ID" },
    { key: "dailyPostingLimits[].sent", type: "number", label: "Already sent" },
    { key: "dailyPostingLimits[].scheduled", type: "number", label: "Currently scheduled" },
    { key: "dailyPostingLimits[].limit", type: "number", label: "Daily cap" },
    { key: "dailyPostingLimits[].isAtLimit", type: "boolean", label: "At the cap" },
  ],

  execute(input, ctx) {
    const channelIds = idList(input.channelIds);
    if (!channelIds) throw new Error("daily-posting-limit-list needs at least one channel ID");
    return new BufferClient(ctx).request(DAILY_LIMITS, {
      input: compact({ channelIds, date: unset(input.date) }),
    });
  },
};

export default dailyPostingLimitList;
