import type { ActionDefinition } from "@w6w/types";
import { BitwardenClient, isoDate, optionalUuid } from "../lib/client.ts";
import { items } from "../lib/shape.ts";

const action: ActionDefinition = {
  key: "event-list",
  type: "read",
  resource: "event",
  title: "List events",
  description:
    "The organization's event log. Filter by date range (ISO 8601; `start` must be before `end`), acting user or related item/secret/project. Results come in pages (about 50) with a `continuationToken`; set `maxPages` above 1 to follow it. Events are the only list endpoint the OpenAPI document gives a continuation token.",
  params: [
    {
      key: "start",
      label: "Start",
      type: "string",
      hint: "ISO 8601 date-time, e.g. 2026-10-01T00:00:00Z. Must be before `end`.",
    },
    {
      key: "end",
      label: "End",
      type: "string",
      hint: "ISO 8601 date-time. Must be after `start`.",
    },
    {
      key: "actingUserId",
      label: "Acting user ID",
      type: "string",
      hint: "Only events performed by this user (`userId`, not the member `id`).",
    },
    { key: "itemId", label: "Item ID", type: "string" },
    { key: "secretId", label: "Secret ID", type: "string" },
    { key: "projectId", label: "Project ID", type: "string" },
    {
      key: "continuationToken",
      label: "Continuation token",
      type: "string",
      hint: "From a previous call's `continuationToken`, to resume.",
    },
    {
      key: "maxPages",
      label: "Max pages",
      type: "number",
      default: 1,
      validation: { min: 1, max: 20, integer: true },
      hint: "How many pages to read (1-20).",
    },
  ],
  output: [
    { key: "events", type: "array", label: "Events, newest first as Bitwarden returns them" },
    { key: "count", type: "number", label: "Events returned" },
    { key: "continuationToken", type: "string", label: "Present when more pages remain" },
    { key: "hasMore", type: "boolean", label: "Whether a continuationToken remains" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new BitwardenClient(ctx);
    const start = isoDate(p.start, "start");
    const end = isoDate(p.end, "end");
    if (start && end && Date.parse(start) >= Date.parse(end)) {
      throw new Error("`start` must be before `end`");
    }
    const filters = {
      start,
      end,
      actingUserId: optionalUuid(p.actingUserId, "actingUserId"),
      itemId: optionalUuid(p.itemId, "itemId"),
      secretId: optionalUuid(p.secretId, "secretId"),
      projectId: optionalUuid(p.projectId, "projectId"),
    };
    const maxPages = Math.min(Math.max(Math.trunc(Number(p.maxPages ?? 1)) || 1, 1), 20);

    const events: unknown[] = [];
    let token = p.continuationToken ? String(p.continuationToken) : undefined;
    for (let page = 0; page < maxPages; page++) {
      const res = await client.request<{ data?: unknown[]; continuationToken?: string | null }>(
        "/events",
        { query: { ...filters, continuationToken: token } },
      );
      events.push(...items(res));
      token = res?.continuationToken || undefined;
      if (!token) break;
    }
    return { events, count: events.length, continuationToken: token, hasMore: Boolean(token) };
  },
};

export default action;
