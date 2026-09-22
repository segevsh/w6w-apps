import type { ActionDefinition } from "@w6w/types";
import { bool, encodeId, SendfoxClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /campaigns/{id}/stats` — a campaign's stored performance counters.
 *
 * Sent, unique-open, unique-click, unsubscribe, bounce and spam counts, plus the
 * five rates derived from them. All of it is read from stored counters, so the
 * call is cheap.
 *
 * ## `include_link_stats` is opt-in for a reason
 *
 * The document says the link breakdown "counts rows in `email_link_clicks` once
 * per link rather than reading a counter", which is why it is off by default.
 * Turning it on also unlocks `link_limit` (1–100, default 50) — the
 * most-clicked links, ranked.
 *
 * `link_limit` is ignored unless `include_link_stats` is on; that is the
 * vendor's wording, not a guess.
 */
interface Input {
  id: number;
  includeLinkStats?: boolean;
  linkLimit?: number;
}

const campaignStatsGet: ActionDefinition<Input> = {
  key: "campaign-stats-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign Stats",
  description: "Read a campaign's sent/open/click/bounce/unsubscribe/spam counters.",
  params: [
    idParam("id", "Campaign", "Campaign id whose stats to read."),
    {
      key: "includeLinkStats",
      label: "Include link stats",
      type: "boolean",
      hint: "Adds `link_stats`, the campaign's links ranked by click count. Off by default " +
        "because it counts click rows rather than reading a stored counter.",
    },
    {
      key: "linkLimit",
      label: "Link limit",
      type: "number",
      default: 50,
      validation: { integer: true, min: 1, max: 100 },
      hint: "How many links to return (1–100). Ignored unless Include link stats is on.",
    },
  ],
  output: [
    { key: "sent_count", type: "number", label: "Emails sent" },
    { key: "unique_open_count", type: "number", label: "Unique opens" },
    { key: "unique_click_count", type: "number", label: "Unique clicks" },
    { key: "unsubscribe_count", type: "number", label: "Unsubscribes" },
    { key: "bounce_count", type: "number", label: "Bounces" },
    { key: "spam_count", type: "number", label: "Spam complaints" },
    { key: "open_rate", type: "number", label: "Open rate" },
    { key: "click_rate", type: "number", label: "Click rate" },
    { key: "unsubscribe_rate", type: "number", label: "Unsubscribe rate" },
    { key: "bounce_rate", type: "number", label: "Bounce rate" },
    { key: "spam_rate", type: "number", label: "Spam rate" },
    { key: "link_stats", type: "array", label: "Links ranked by clicks (opt-in)" },
  ],

  execute(input, ctx) {
    return new SendfoxClient(ctx).json(`/campaigns/${encodeId(input.id)}/stats`, {
      query: {
        include_link_stats: bool(input.includeLinkStats),
        link_limit: input.linkLimit,
      },
    });
  },
};

export default campaignStatsGet;
