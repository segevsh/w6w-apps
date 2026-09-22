import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, SimpleTextingClient } from "../lib/client.ts";
import { campaignIdParam } from "../lib/params.ts";

/**
 * `GET /api/campaigns/{campaignId}` — "Get a Campaign".
 *
 * The full `FetchedCampaignDto` for one campaign: `{campaignId, title,
 * accountPhone, customFieldsMaxLength, state, type, lists, segments, created,
 * modified, started, finished, messageTemplate, origin, outcome,
 * trackingLinks}`.
 *
 * Four fields deserve a word:
 *
 * - **`outcome`** — `{successRate, optOutRate, totalSent, creditsTotal}`. This is
 *   the only place in the API that reports what a campaign cost and how it
 *   landed; it is populated once the campaign has run, and is the field to poll
 *   after `campaign-send`.
 * - **`state`** vs **`type`** — what happened versus how it was scheduled. A
 *   campaign sent by this app reports `origin: API_V2`.
 * - **`trackingLinks`** — `{url, clickCount}` per link, the click-through side
 *   of the campaign. The schema's own example URL is the vendor's short domain
 *   (`www.simpletexting.net`), which is consistent with the rewriting the Send
 *   Message description documents for third-party shorteners.
 * - **`messageTemplate`** — the *fetched* template, which carries a detected
 *   `category` that the request template does not. That is the field that says
 *   whether the campaign actually went out as SMS, EXTENDED_SMS or MMS.
 *
 * The path is the campaign's hexadecimal ID, escaped as one segment. The
 * endpoint's own example URL is missing the `/campaigns/` segment
 * (`.../v2/api/507f1f77…`) — a documentation typo, not a second route; the
 * OpenAPI path is `/api/campaigns/{campaignId}` and that is what is called.
 */
interface Input {
  campaignId: string;
}

const campaignGet: ActionDefinition<Input> = {
  key: "campaign-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign",
  description: "Read one campaign, including its delivery outcome and message template.",
  params: [campaignIdParam],
  output: [
    { key: "campaignId", type: "string", label: "Campaign ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "accountPhone", type: "string", label: "Sent from" },
    { key: "state", type: "string", label: "State" },
    { key: "type", type: "string", label: "How it was scheduled" },
    { key: "lists", type: "array", label: "Lists targeted" },
    { key: "segments", type: "array", label: "Segments targeted" },
    { key: "messageTemplate", type: "object", label: "Message template, with detected category" },
    { key: "outcome", type: "object", label: "successRate, optOutRate, totalSent, creditsTotal" },
    { key: "trackingLinks", type: "array", label: "Links and click counts" },
    { key: "origin", type: "string", label: "API_V2 when sent through the API" },
    { key: "created", type: "string", label: "Created at (ISO 8601)" },
    { key: "started", type: "string", label: "Started at (ISO 8601)" },
    { key: "finished", type: "string", label: "Finished at (ISO 8601)" },
  ],

  execute(input, ctx) {
    return new SimpleTextingClient(ctx).json(
      `/api/campaigns/${encodePathSegment(input.campaignId)}`,
    );
  },
};

export default campaignGet;
