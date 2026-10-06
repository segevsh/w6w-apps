import type { ActionDefinition } from "@w6w/types";
import type { Param } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { deepMerge } from "../lib/merge.ts";

export interface EventFields {
  name?: string;
  summary?: string;
  description?: string;
  startUtc?: string;
  endUtc?: string;
  timezone?: string;
  hideStartDate?: boolean;
  hideEndDate?: boolean;
  currency?: string;
  onlineEvent?: boolean;
  organizerId?: string;
  logoId?: string;
  venueId?: string;
  formatId?: string;
  categoryId?: string;
  subcategoryId?: string;
  listed?: boolean;
  shareable?: boolean;
  inviteOnly?: boolean;
  showRemaining?: boolean;
  password?: string;
  capacity?: number;
  isReservedSeating?: boolean;
  isSeries?: boolean;
  locale?: string;
  source?: string;
  extra?: Record<string, unknown>;
}

/** Event fields shared by Event Create and Event Update (name/start/end/currency differ in `required`). */
export function eventFieldParams(opts: { create: boolean }): Param[] {
  const params: Param[] = [
    { key: "name", label: "Name", type: "string", required: opts.create },
    {
      key: "summary",
      label: "Summary",
      type: "text",
      hint: "Plain text, max 140 characters. Mutually exclusive with `description`.",
    },
    {
      key: "description",
      label: "Description (HTML, deprecated)",
      type: "text",
      hint: "Deprecated by Eventbrite; mutually exclusive with `summary`.",
      advanced: true,
    },
    {
      key: "startUtc",
      label: "Start (UTC)",
      type: "string",
      required: opts.create,
      hint: "ISO 8601 UTC, e.g. `2026-12-01T18:00:00Z`.",
    },
    {
      key: "endUtc",
      label: "End (UTC)",
      type: "string",
      required: opts.create,
      hint: "ISO 8601 UTC, e.g. `2026-12-01T20:00:00Z`.",
    },
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      required: opts.create,
      hint: "Olson name, e.g. `America/Los_Angeles`. Applied to start and end.",
    },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      required: opts.create,
      hint: "ISO 4217, e.g. `USD`.",
    },
    { key: "hideStartDate", label: "Hide start date", type: "boolean", advanced: true },
    { key: "hideEndDate", label: "Hide end date", type: "boolean", advanced: true },
    { key: "onlineEvent", label: "Online event", type: "boolean" },
    { key: "organizerId", label: "Organizer ID", type: "string" },
    { key: "logoId", label: "Logo image ID", type: "string", advanced: true },
    { key: "venueId", label: "Venue ID", type: "string" },
    { key: "formatId", label: "Format ID", type: "string", advanced: true },
    { key: "categoryId", label: "Category ID", type: "string", advanced: true },
    { key: "subcategoryId", label: "Subcategory ID (US only)", type: "string", advanced: true },
    { key: "listed", label: "Publicly listed", type: "boolean" },
    { key: "shareable", label: "Shareable", type: "boolean", advanced: true },
    { key: "inviteOnly", label: "Invite only", type: "boolean", advanced: true },
    { key: "showRemaining", label: "Show remaining tickets", type: "boolean", advanced: true },
    { key: "password", label: "Password", type: "string", advanced: true },
    { key: "capacity", label: "Capacity", type: "number" },
    { key: "isReservedSeating", label: "Reserved seating", type: "boolean", advanced: true },
    { key: "isSeries", label: "Series parent", type: "boolean", advanced: true },
  ];
  if (opts.create) {
    params.push({
      key: "locale",
      label: "Locale",
      type: "string",
      advanced: true,
      hint: "e.g. `en_US` (default), `fr_FR`, `de_DE`.",
    });
  }
  params.push(
    { key: "source", label: "Source", type: "string", advanced: true },
    {
      key: "extra",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint: "Object deep-merged into the `event` body (snake_case Eventbrite field names).",
    },
  );
  return params;
}

/** Build the (unwrapped) Eventbrite event object from flat inputs. */
export function buildEventBody(input: EventFields): Record<string, unknown> {
  const e: Record<string, unknown> = {};
  if (input.name !== undefined) e.name = { html: input.name };
  if (input.summary !== undefined) e.summary = input.summary;
  if (input.description !== undefined) e.description = { html: input.description };
  if (input.startUtc !== undefined) {
    e.start = { timezone: input.timezone, utc: input.startUtc };
  }
  if (input.endUtc !== undefined) {
    e.end = { timezone: input.timezone, utc: input.endUtc };
  }
  const simple: Array<[string, unknown]> = [
    ["hide_start_date", input.hideStartDate],
    ["hide_end_date", input.hideEndDate],
    ["currency", input.currency],
    ["online_event", input.onlineEvent],
    ["organizer_id", input.organizerId],
    ["logo_id", input.logoId],
    ["venue_id", input.venueId],
    ["format_id", input.formatId],
    ["category_id", input.categoryId],
    ["subcategory_id", input.subcategoryId],
    ["listed", input.listed],
    ["shareable", input.shareable],
    ["invite_only", input.inviteOnly],
    ["show_remaining", input.showRemaining],
    ["password", input.password],
    ["capacity", input.capacity],
    ["is_reserved_seating", input.isReservedSeating],
    ["is_series", input.isSeries],
    ["locale", input.locale],
    ["source", input.source],
  ];
  for (const [k, v] of simple) {
    if (v !== undefined && v !== null && v !== "") e[k] = v;
  }
  return input.extra ? deepMerge(e, input.extra) : e;
}

// Eventbrite's Event object, returned unwrapped (no `event` envelope). Its
// multipart-text (`name`, `description`) and datetime-tz (`start`, `end`)
// fields are objects, so their leaves are declared as dot paths too — the
// workflow editor offers each one, e.g. `{{ steps.<id>.output.name.text }}`.
export const EVENT_OUTPUT = [
  { key: "id", type: "string", label: "Event ID" },
  { key: "name", type: "object", label: "Name" },
  { key: "name.text", type: "string", label: "Name (text)" },
  { key: "name.html", type: "string", label: "Name (HTML)" },
  { key: "description", type: "object", label: "Description" },
  { key: "description.text", type: "string", label: "Description (text)" },
  { key: "description.html", type: "string", label: "Description (HTML)" },
  { key: "summary", type: "string", label: "Summary" },
  { key: "start", type: "object", label: "Start" },
  { key: "start.utc", type: "string", label: "Start (UTC)" },
  { key: "start.local", type: "string", label: "Start (local)" },
  { key: "start.timezone", type: "string", label: "Start timezone" },
  { key: "end", type: "object", label: "End" },
  { key: "end.utc", type: "string", label: "End (UTC)" },
  { key: "end.local", type: "string", label: "End (local)" },
  { key: "end.timezone", type: "string", label: "End timezone" },
  { key: "status", type: "string", label: "Status" },
  { key: "url", type: "string", label: "URL" },
  { key: "currency", type: "string", label: "Currency" },
  { key: "capacity", type: "number", label: "Capacity" },
  { key: "is_free", type: "boolean", label: "Free event" },
  { key: "online_event", type: "boolean", label: "Online event" },
  { key: "listed", type: "boolean", label: "Listed" },
  { key: "created", type: "string", label: "Created" },
  { key: "changed", type: "string", label: "Changed" },
  { key: "published", type: "string", label: "Published" },
  { key: "organization_id", type: "string", label: "Organization ID" },
  { key: "organizer_id", type: "string", label: "Organizer ID" },
  { key: "venue_id", type: "string", label: "Venue ID" },
] as const;

interface Input extends EventFields {
  organizationId: string;
}

const createEvent: ActionDefinition<Input> = {
  key: "create-event",
  type: "perform",
  idempotent: false,
  resource: "event",
  title: "Create Event",
  description:
    "Create a new draft event in an organization on Eventbrite. Set Series parent to create a recurring-event parent, then add occurrences with Create Event Schedule. Publish it separately.",
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
    ...eventFieldParams({ create: true }),
  ],
  output: [...EVENT_OUTPUT],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(
      `/organizations/${encodeURIComponent(input.organizationId)}/events/`,
      { method: "POST", body: { event: buildEventBody(input) } },
    );
  },
};

export default createEvent;
