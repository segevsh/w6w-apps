/**
 * Building Graph's `event` resource, shared by Create Event and Update Event.
 *
 * https://learn.microsoft.com/en-us/graph/api/resources/event
 *
 * Create and update take the same resource; the only real difference is that
 * create needs `start` and `end` while a PATCH may carry any subset. Both go
 * through `buildEvent`, which emits only the properties the caller actually
 * set — so an update never silently clears a field it was not asked about.
 */
import { compact, dateTimeTimeZone, itemBody } from "./client.ts";
import type { Param } from "@w6w/types";

/** Graph's `attendeeType`. `resource` is how a room or equipment is booked. */
export type AttendeeType = "required" | "optional" | "resource";

export interface EventInput {
  subject?: string;
  bodyContent?: string;
  bodyType?: string;
  start?: string;
  end?: string;
  timeZone?: string;
  isAllDay?: boolean;
  location?: string;
  requiredAttendees?: string[];
  optionalAttendees?: string[];
  resourceAttendees?: string[];
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: string;
  showAs?: string;
  sensitivity?: string;
  importance?: string;
  categories?: string[];
  isReminderOn?: boolean;
  reminderMinutesBeforeStart?: number;
  responseRequested?: boolean;
  allowNewTimeProposals?: boolean;
  hideAttendees?: boolean;
  recurrence?: unknown;
  transactionId?: string;
}

/** Assemble the `event` resource, omitting anything the caller left unset. */
export function buildEvent(input: EventInput): Record<string, unknown> {
  return compact({
    subject: input.subject,
    body: itemBody(input.bodyContent, input.bodyType),
    start: input.start ? dateTimeTimeZone(input.start, input.timeZone) : undefined,
    end: input.end ? dateTimeTimeZone(input.end, input.timeZone) : undefined,
    isAllDay: input.isAllDay,
    location: input.location ? { displayName: input.location } : undefined,
    attendees: buildAttendees(input),
    isOnlineMeeting: input.isOnlineMeeting,
    onlineMeetingProvider: input.onlineMeetingProvider,
    showAs: input.showAs,
    sensitivity: input.sensitivity,
    importance: input.importance,
    categories: input.categories?.length ? input.categories : undefined,
    isReminderOn: input.isReminderOn,
    reminderMinutesBeforeStart: input.reminderMinutesBeforeStart,
    responseRequested: input.responseRequested,
    allowNewTimeProposals: input.allowNewTimeProposals,
    hideAttendees: input.hideAttendees,
    recurrence: parseRecurrence(input.recurrence),
    transactionId: input.transactionId,
  });
}

/**
 * Merge the three attendee lists into Graph's single `attendees` collection,
 * each entry tagged with its `type`. Returns `undefined` when all three are
 * empty, so a PATCH that does not mention attendees does not wipe them — Graph
 * treats an explicit list as a full replacement and notifies the difference.
 */
function buildAttendees(input: EventInput): Array<Record<string, unknown>> | undefined {
  const groups: Array<[AttendeeType, string[] | undefined]> = [
    ["required", input.requiredAttendees],
    ["optional", input.optionalAttendees],
    ["resource", input.resourceAttendees],
  ];

  const attendees: Array<Record<string, unknown>> = [];
  for (const [type, list] of groups) {
    for (const raw of list ?? []) {
      const entry = (raw ?? "").trim();
      if (!entry) continue;
      const match = entry.match(/^(.*?)\s*<\s*([^>]+?)\s*>$/);
      attendees.push({
        type,
        emailAddress: match
          ? compact({ address: match[2], name: match[1] || undefined })
          : { address: entry },
      });
    }
  }
  return attendees.length ? attendees : undefined;
}

/**
 * `recurrence` is a `patternedRecurrence` — a two-part object (`pattern` +
 * `range`) with far too much shape to model as form fields, so it is taken as
 * JSON. A string is accepted too, since a `json` param may arrive either way
 * depending on how the value was bound upstream.
 */
function parseRecurrence(value: unknown): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    // No doc URL in the message: the pack auditor reads string literals as
    // egress hosts, and a `learn.microsoft.com` link is documentation, not a
    // request. See the `recurrence` param hint for the shape.
    throw new Error(
      "recurrence: expected a JSON object with `pattern` and `range` keys (Microsoft Graph `patternedRecurrence`).",
    );
  }
}

/**
 * The event fields shared by Create Event and Update Event.
 *
 * `start`/`end` are declared here as optional and marked required by Create
 * Event alone, because a PATCH legitimately changes one property in isolation.
 */
export function eventParams(): Param[] {
  return [
    { key: "subject", label: "Title", type: "string" },
    { key: "bodyContent", label: "Description", type: "text" },
    {
      key: "bodyType",
      label: "Description format",
      type: "select",
      default: "HTML",
      advanced: true,
      options: [
        { value: "HTML", label: "HTML" },
        { value: "Text", label: "Plain text" },
      ],
    },
    { key: "location", label: "Location", type: "string" },
    {
      key: "requiredAttendees",
      label: "Required attendees",
      type: "string",
      repeat: true,
      hint: "Email addresses. `Alice <alice@example.com>` is accepted too.",
    },
    {
      key: "optionalAttendees",
      label: "Optional attendees",
      type: "string",
      repeat: true,
      advanced: true,
    },
    {
      key: "resourceAttendees",
      label: "Rooms / equipment",
      type: "string",
      repeat: true,
      advanced: true,
      hint: "Resource mailbox addresses — booked as attendees of type `resource`.",
    },
    {
      key: "isOnlineMeeting",
      label: "Create an online meeting",
      type: "boolean",
      advanced: true,
    },
    {
      key: "onlineMeetingProvider",
      label: "Meeting provider",
      type: "select",
      advanced: true,
      dependsOn: ["isOnlineMeeting"],
      options: [
        { value: "teamsForBusiness", label: "Microsoft Teams" },
        { value: "skypeForBusiness", label: "Skype for Business" },
        { value: "skypeForConsumer", label: "Skype" },
      ],
    },
    {
      key: "showAs",
      label: "Show as",
      type: "select",
      advanced: true,
      options: [
        { value: "free", label: "Free" },
        { value: "tentative", label: "Tentative" },
        { value: "busy", label: "Busy" },
        { value: "oof", label: "Out of office" },
        { value: "workingElsewhere", label: "Working elsewhere" },
        { value: "unknown", label: "Unknown" },
      ],
    },
    {
      key: "sensitivity",
      label: "Sensitivity",
      type: "select",
      advanced: true,
      options: [
        { value: "normal", label: "Normal" },
        { value: "personal", label: "Personal" },
        { value: "private", label: "Private" },
        { value: "confidential", label: "Confidential" },
      ],
    },
    {
      key: "importance",
      label: "Importance",
      type: "select",
      advanced: true,
      options: [
        { value: "low", label: "Low" },
        { value: "normal", label: "Normal" },
        { value: "high", label: "High" },
      ],
    },
    { key: "categories", label: "Categories", type: "string", repeat: true, advanced: true },
    { key: "isReminderOn", label: "Reminder on", type: "boolean", advanced: true },
    {
      key: "reminderMinutesBeforeStart",
      label: "Remind (minutes before)",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 0 },
    },
    { key: "responseRequested", label: "Request responses", type: "boolean", advanced: true },
    {
      key: "allowNewTimeProposals",
      label: "Allow new time proposals",
      type: "boolean",
      advanced: true,
      hint: "Graph defaults this to true on newly created events.",
    },
    { key: "hideAttendees", label: "Hide attendee list", type: "boolean", advanced: true },
    {
      key: "recurrence",
      label: "Recurrence",
      type: "json",
      advanced: true,
      hint:
        'A `patternedRecurrence`: `{"pattern":{"type":"weekly","interval":1,"daysOfWeek":["Monday"]},"range":{"type":"endDate","startDate":"2026-09-01","endDate":"2026-12-31"}}`.',
    },
  ];
}

/** The start/end/time-zone triple, so Create and Update stay in step. */
export function scheduleParams(required: boolean): Param[] {
  return [
    {
      key: "start",
      label: "Starts",
      type: "datetime",
      required,
      placeholder: "2026-08-15T12:00:00",
      hint:
        "Local wall-clock time in the Time zone below. A trailing `Z` or UTC offset is stripped — Graph carries the zone separately.",
    },
    {
      key: "end",
      label: "Ends",
      type: "datetime",
      required,
      placeholder: "2026-08-15T13:00:00",
    },
    {
      key: "timeZone",
      label: "Time zone",
      type: "string",
      default: "UTC",
      placeholder: "Pacific Standard Time",
      hint: "Windows or IANA time-zone name applied to both Starts and Ends. Defaults to UTC.",
    },
    {
      key: "isAllDay",
      label: "All-day event",
      type: "boolean",
      advanced: true,
      hint: "Set Starts and Ends to the day boundaries (midnight) in the chosen time zone.",
    },
  ];
}
