import type { ActionDefinition } from "@w6w/types";
import { MailerooClient } from "../lib/client.ts";
import { CHANNELS } from "./send-verification.ts";

interface Input {
  status?: string;
  channel?: string;
  senderProfileId?: string;
  to?: string;
  country?: string;
  createdAfter?: string;
  createdBefore?: string;
  ids?: string;
  limit?: number;
  cursor?: string;
}

const STATUSES = ["pending", "sent", "verified", "expired", "failed", "cancelled"];
const opts = (v: string[]) => v.map((x) => ({ value: x, label: x }));

/** `GET /v1/verify/verifications` (scope `verify.verifications.read`) — cursor pagination. */
const listVerifications: ActionDefinition<Input> = {
  key: "list-verifications",
  type: "search",
  resource: "verification",
  title: "List Verifications",
  description: "Search verification history (120 days retained), newest first, by status, " +
    "channel, profile, destination, country, time range or IDs. Account API Key " +
    "(verify.verifications.read).",
  params: [
    { key: "status", label: "Status", type: "select", options: opts(STATUSES) },
    { key: "channel", label: "Channel", type: "select", options: opts(CHANNELS) },
    { key: "senderProfileId", label: "Sender profile ID", type: "string" },
    { key: "to", label: "Destination", type: "string" },
    { key: "country", label: "Country code", type: "string" },
    { key: "createdAfter", label: "Created at or after", type: "string", hint: "RFC 3339." },
    { key: "createdBefore", label: "Created before", type: "string", hint: "RFC 3339." },
    { key: "ids", label: "IDs", type: "string", hint: "Comma-separated, at most 100 distinct." },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      validation: { min: 1, max: 100, integer: true },
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "`nextCursor` from the previous page; empty for the first.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Verifications (no code, no updated_at)" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page (null at the end)" },
    { key: "hasMore", type: "boolean", label: "Another page follows" },
    { key: "total", type: "number", label: "Matching verifications, independent of the page" },
  ],

  async execute(input, ctx) {
    const { data } = await new MailerooClient(ctx).account("/verify/verifications", {
      query: {
        status: input.status,
        channel: input.channel,
        sender_profile_id: input.senderProfileId?.trim(),
        to: input.to?.trim(),
        country: input.country?.trim(),
        created_after: input.createdAfter?.trim(),
        created_before: input.createdBefore?.trim(),
        ids: input.ids?.trim(),
        limit: input.limit,
        cursor: input.cursor?.trim(),
      },
    });
    const d = (data ?? {}) as { items?: unknown[]; next_cursor?: string | null; total?: number };
    return {
      items: d.items ?? [],
      nextCursor: d.next_cursor ?? null,
      hasMore: Boolean(d.next_cursor),
      total: d.total,
    };
  },
};

export default listVerifications;
