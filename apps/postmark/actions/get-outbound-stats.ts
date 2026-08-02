import type { ActionDefinition } from "@w6w/types";
import { postmarkFetch } from "../lib/client.ts";

interface Input {
  tag?: string;
  fromdate?: string;
  todate?: string;
  messageStream?: string;
}

/**
 * `GET /stats/outbound` — sending overview (sent, bounced, opens, clicks,
 * ...) for this server, optionally filtered by tag, date range, or stream.
 * https://postmarkapp.com/developer/api/stats-api#outbound-stats
 */
const getOutboundStats: ActionDefinition<Input> = {
  key: "get-outbound-stats",
  type: "read",
  resource: "stats",
  title: "Get Outbound Stats",
  description: "Get an outbound sending overview: sent, bounced, opens, clicks, spam complaints.",
  params: [
    { key: "tag", label: "Tag", type: "string" },
    { key: "fromdate", label: "From Date", type: "string", hint: "YYYY-MM-DD, inclusive." },
    { key: "todate", label: "To Date", type: "string", hint: "YYYY-MM-DD, inclusive." },
    {
      key: "messageStream",
      label: "Message Stream",
      type: "string",
      hint: "Omit to include all streams.",
    },
  ],
  output: [
    { key: "Sent", type: "number", label: "Sent" },
    { key: "Bounced", type: "number", label: "Bounced" },
    { key: "BounceRate", type: "number", label: "Bounce Rate" },
    { key: "SpamComplaints", type: "number", label: "Spam Complaints" },
    { key: "Opens", type: "number", label: "Opens" },
    { key: "UniqueOpens", type: "number", label: "Unique Opens" },
    { key: "TotalClicks", type: "number", label: "Total Clicks" },
  ],

  execute(input, ctx) {
    const qs = new URLSearchParams();
    if (input.tag) qs.set("tag", input.tag);
    if (input.fromdate) qs.set("fromdate", input.fromdate);
    if (input.todate) qs.set("todate", input.todate);
    if (input.messageStream) qs.set("messagestream", input.messageStream);
    const query = qs.toString();
    return postmarkFetch(ctx, `/stats/outbound${query ? `?${query}` : ""}`);
  },
};

export default getOutboundStats;
