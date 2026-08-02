import type { ActionDefinition } from "@w6w/types";
import { postmarkFetch } from "../lib/client.ts";

interface Input {
  count?: number;
  offset?: number;
  type?: string;
  inactive?: boolean;
  emailFilter?: string;
  tag?: string;
  messageId?: string;
  fromdate?: string;
  todate?: string;
  messageStream?: string;
}

/**
 * `GET /bounces` — search this server's bounce log. `count + offset` must
 * stay <= 10,000. `type` is one of Postmark's bounce-type names (e.g.
 * `HardBounce`, `SoftBounce`, `SpamComplaint`, `Transient`) — left as free
 * text since the vendor's list runs to dozens of values.
 * https://postmarkapp.com/developer/api/bounce-api#bounces
 */
const listBounces: ActionDefinition<Input> = {
  key: "list-bounces",
  type: "read",
  resource: "bounce",
  title: "List Bounces",
  description: "Search this server's bounce log.",
  params: [
    { key: "count", label: "Count", type: "number", default: 50, hint: "Max 500 per request." },
    { key: "offset", label: "Offset", type: "number", default: 0 },
    {
      key: "type",
      label: "Bounce Type",
      type: "string",
      hint:
        "e.g. HardBounce, SoftBounce, SpamComplaint, Transient. See Postmark's bounce type list.",
    },
    { key: "inactive", label: "Inactive Only", type: "boolean" },
    { key: "emailFilter", label: "Email Contains", type: "string" },
    { key: "tag", label: "Tag", type: "string" },
    { key: "messageId", label: "Message ID", type: "string" },
    {
      key: "fromdate",
      label: "From Date",
      type: "string",
      hint: "YYYY-MM-DD, Eastern Time, inclusive.",
    },
    {
      key: "todate",
      label: "To Date",
      type: "string",
      hint: "YYYY-MM-DD, Eastern Time, inclusive.",
    },
    { key: "messageStream", label: "Message Stream", type: "string" },
  ],
  output: [
    { key: "TotalCount", type: "number", label: "Total Count" },
    { key: "Bounces", type: "array", label: "Bounces" },
  ],

  execute(input, ctx) {
    const qs = new URLSearchParams();
    qs.set("count", String(input.count ?? 50));
    qs.set("offset", String(input.offset ?? 0));
    if (input.type) qs.set("type", input.type);
    if (input.inactive !== undefined) qs.set("inactive", String(input.inactive));
    if (input.emailFilter) qs.set("emailFilter", input.emailFilter);
    if (input.tag) qs.set("tag", input.tag);
    if (input.messageId) qs.set("messageID", input.messageId);
    if (input.fromdate) qs.set("fromdate", input.fromdate);
    if (input.todate) qs.set("todate", input.todate);
    if (input.messageStream) qs.set("messagestream", input.messageStream);
    return postmarkFetch(ctx, `/bounces?${qs.toString()}`);
  },
};

export default listBounces;
