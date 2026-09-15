import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the AddEvent actions.
 *
 * Every field, pattern, enum and default here is copied from the `event-input`,
 * `calendar-input` and `attendee-input` schemas of AddEvent's OpenAPI 3.1 document
 * (`v2.14.0`, fetched 2026-09-15 from the `oasDefinition` embedded in its ReadMe
 * reference pages). Param `key`s are camelCase, matching this pack's convention; the
 * comment on each notes the wire field name it maps to.
 */

/** AddEvent's one accepted datetime shape, documented on every datetime field. */
export const DATETIME_HINT =
  "YYYY-MM-DD hh:mm:ss, YYYY-MM-DD hh:mm, or YYYY-MM-DD (e.g. 2026-06-01 10:00).";

export const pageParam: Param = {
  key: "page",
  label: "Page",
  type: "number",
  default: 1,
  validation: { integer: true, min: 1 },
  hint: "Page number of the search results. The first page is 1.",
};

export const pageSizeParam: Param = {
  key: "pageSize",
  label: "Page size",
  type: "number",
  default: 10,
  validation: { integer: true, min: 1, max: 20 },
  hint: "Objects per page. AddEvent caps this at 20; the vendor default is 10.",
};

export function sortOrderParam(): Param {
  return {
    key: "sortOrder",
    label: "Sort order",
    type: "select",
    default: "desc",
    options: [
      { value: "asc", label: "Ascending" },
      { value: "desc", label: "Descending (default)" },
    ],
    hint: "Requires sortBy to also be set.",
  };
}

export const eventSortByOptions = [
  { value: "created", label: "Created (default)" },
  { value: "title", label: "Title" },
  { value: "calendar_id", label: "Calendar ID" },
  { value: "datetime_start", label: "Start time" },
];

export const calendarSortByOptions = [
  { value: "created", label: "Created (default)" },
  { value: "title", label: "Title" },
];

export const attendeeSortByOptions = [
  { value: "created", label: "Created (default)" },
  { value: "event_id", label: "Event ID" },
  { value: "attending", label: "Response" },
  { value: "email", label: "Email" },
];

export const subscriberSortByOptions = [
  { value: "created", label: "Created (default)" },
  { value: "synced", label: "Last synced" },
  { value: "calendar_id", label: "Calendar ID" },
];

export const freeBusyOptions = [
  { value: "free", label: "Free — does not block the user's calendar" },
  { value: "busy", label: "Busy — blocks the user's calendar" },
  { value: "default", label: "Default — the user's own free/busy setting" },
];

export const attendingOptions = [
  { value: "going", label: "Going" },
  { value: "maybe", label: "Maybe" },
  { value: "not-going", label: "Not going" },
];

export const subscriberStatusOptions = [
  { value: "active", label: "Active — synced within the last 30 days" },
  { value: "inactive", label: "Inactive — not synced within the last 30 days" },
  { value: "blocked", label: "Blocked by the calendar owner" },
];

export const eventIdParam: Param = {
  key: "eventId",
  label: "Event ID",
  type: "string",
  required: true,
  hint: "The event's id (`event_id` on the wire), from a Create Event or Search Events result.",
};

export const calendarIdParam: Param = {
  key: "calendarId",
  label: "Calendar ID",
  type: "string",
  required: true,
  hint: "The calendar's id (`calendar_id` on the wire), from a Create Calendar or Search " +
    "Calendars result.",
};

export const attendeeIdParam: Param = {
  key: "attendeeId",
  label: "RSVP attendee ID",
  type: "string",
  required: true,
  hint: "The attendee's id (`attendee_id` on the wire), from a Create RSVP Attendee or Search " +
    "RSVP Attendees result.",
};

export const subscriberIdParam: Param = {
  key: "subscriberId",
  label: "Calendar subscriber ID",
  type: "string",
  required: true,
  hint: "The subscriber's id (`subscriber_id` on the wire), from a Search Calendar Subscribers " +
    "result.",
};

/** Comma-separated id list filter, shared by every search endpoint that offers it. */
export const calendarIdsParam: Param = {
  key: "calendarIds",
  label: "Calendar IDs",
  type: "string",
  advanced: true,
  hint: "Comma-separated list of calendar IDs to limit the search to (`calendar_ids` on the wire).",
};

export const eventIdsParam: Param = {
  key: "eventIds",
  label: "Event IDs",
  type: "string",
  advanced: true,
  hint: "Comma-separated list of event IDs to limit the search to (`event_ids` on the wire).",
};

export const customDataKeyParam: Param = {
  key: "customDataKey",
  label: "Custom data key",
  type: "string",
  advanced: true,
  hint: "Limit results to objects whose custom_data has this key. Requires customDataValue too.",
};

export const customDataValueParam: Param = {
  key: "customDataValue",
  label: "Custom data value",
  type: "string",
  advanced: true,
  hint: "Limit results to objects whose custom_data has this value. Requires customDataKey too.",
};

/**
 * The full `event-input` field set, shared by Create Event and Update Event.
 *
 * `required` selects create-vs-update: AddEvent's OpenAPI document requires
 * `title` + `datetime_start` only on `POST /events`, and the update schema
 * (`event-input-update`) adds none of its own — "any fields you omit remain
 * unchanged" is the vendor's own wording for a PATCH.
 */
export function eventInputParams(required: boolean): Param[] {
  return [
    {
      key: "title",
      label: "Title",
      type: "string",
      required,
      hint: "Must be a non-empty, single-line string.",
    },
    {
      key: "calendarId",
      label: "Calendar ID",
      type: "string",
      hint: "Wire field calendar_id. Defaults to the account's default calendar if not provided.",
    },
    {
      key: "datetimeStart",
      label: "Start",
      type: "string",
      required,
      hint: `Wire field datetime_start. ${DATETIME_HINT}`,
    },
    {
      key: "datetimeEnd",
      label: "End",
      type: "string",
      hint: `Wire field datetime_end. ${DATETIME_HINT} Defaults to start + 1 hour.`,
    },
    {
      key: "allDayEvent",
      label: "All-day event",
      type: "boolean",
      default: false,
      hint: "Wire field all_day_event. When true, only the date is used — start/end time are " +
        "ignored.",
    },
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      advanced: true,
      hint: "IANA name from List Timezones, or the special value floating (same clock time in " +
        "every viewer's own timezone). Defaults to the calendar's timezone.",
    },
    {
      key: "recurringRule",
      label: "Recurring rule",
      type: "string",
      advanced: true,
      hint: "Wire field recurring_rule, in iCalendar RRULE format (e.g. FREQ=DAILY;COUNT=2). " +
        "Not supported by Yahoo Calendar; datetimeStart must match the rule for Outlook desktop " +
        "and Apple Calendar. Leave empty for a non-repeating event.",
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      hint: "Plain text or simplified HTML. AddEvent recommends 500 characters or fewer for " +
        "cross-browser compatibility.",
    },
    {
      key: "internalName",
      label: "Internal name",
      type: "string",
      advanced: true,
      hint: "Wire field internal_name. Not shown publicly.",
    },
    {
      key: "location",
      label: "Location",
      type: "string",
      hint: "An address or a URL (e.g. a meeting link). Mutually exclusive with a saved " +
        "location id.",
    },
    {
      key: "locationId",
      label: "Saved location ID",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 0 },
      hint: "Wire field location_id. Mutually exclusive with Location. 0 means no saved " +
        "location.",
    },
    {
      key: "organizerName",
      label: "Organizer name",
      type: "string",
      advanced: true,
      hint: "Wire field organizer_name. Requires organizerEmail too. Setting an organizer makes " +
        "calendar clients like Outlook desktop treat this as a meeting rather than an " +
        "appointment.",
    },
    {
      key: "organizerEmail",
      label: "Organizer email",
      type: "string",
      advanced: true,
      hint: "Wire field organizer_email. Requires organizerName too.",
    },
    {
      key: "reminder",
      label: "Reminder (minutes before)",
      type: "number",
      default: 30,
      advanced: true,
      validation: { integer: true, min: 0, max: 10800 },
      hint: "Only honoured by Apple Calendar, Outlook desktop, and Office 365/Outlook.com via " +
        "the Microsoft Events API.",
    },
    {
      key: "color",
      label: "Color",
      type: "number",
      default: 1,
      advanced: true,
      validation: { integer: true, min: 1, max: 20 },
      hint: "1-20, corresponding to the calendar's color palette.",
    },
    {
      key: "freeBusy",
      label: "Free / busy",
      type: "select",
      default: "default",
      advanced: true,
      options: freeBusyOptions,
      hint: "Wire field free_busy.",
    },
    {
      key: "landingPageTemplateId",
      label: "Landing page template ID",
      type: "string",
      default: "default",
      advanced: true,
      hint: 'Wire field landing_page_template_id. "default" uses AddEvent\'s standard template, ' +
        "or an id from List Event Templates.",
    },
    {
      key: "rsvpEnabled",
      label: "RSVP enabled",
      type: "boolean",
      default: false,
      hint: "Wire field rsvp_enabled. Requires a response + details before a viewer can add the " +
        "event to their calendar.",
    },
    {
      key: "rsvpFormId",
      label: "RSVP form ID",
      type: "string",
      default: "default",
      advanced: true,
      hint: 'Wire field rsvp_form_id. "default" uses AddEvent\'s standard form, or an id from ' +
        "List RSVP Forms.",
    },
    {
      key: "customData",
      label: "Custom data",
      type: "json",
      advanced: true,
      hint: "Wire field custom_data. Arbitrary key-value pairs, e.g. an external id linking this " +
        "event to another system. Use snake_case keys.",
    },
  ];
}

export interface EventInput {
  title?: string;
  calendarId?: string;
  datetimeStart?: string;
  datetimeEnd?: string;
  allDayEvent?: boolean;
  timezone?: string;
  recurringRule?: string;
  description?: string;
  internalName?: string;
  location?: string;
  locationId?: number;
  organizerName?: string;
  organizerEmail?: string;
  reminder?: number;
  color?: number;
  freeBusy?: string;
  landingPageTemplateId?: string;
  rsvpEnabled?: boolean;
  rsvpFormId?: string;
  customData?: Record<string, unknown>;
}

/** Map {@link EventInput}'s camelCase keys onto the wire's snake_case body. */
export function eventInputBody(input: EventInput): Record<string, unknown> {
  return compactBody({
    title: input.title,
    calendar_id: input.calendarId,
    datetime_start: input.datetimeStart,
    datetime_end: input.datetimeEnd,
    all_day_event: input.allDayEvent,
    timezone: input.timezone,
    recurring_rule: input.recurringRule,
    description: input.description,
    internal_name: input.internalName,
    location: input.location,
    location_id: input.locationId,
    organizer_name: input.organizerName,
    organizer_email: input.organizerEmail,
    reminder: input.reminder,
    color: input.color,
    free_busy: input.freeBusy,
    landing_page_template_id: input.landingPageTemplateId,
    rsvp_enabled: input.rsvpEnabled,
    rsvp_form_id: input.rsvpFormId,
    custom_data: input.customData,
  });
}

/** The full `calendar-input` field set, shared by Create Calendar and Update Calendar. */
export function calendarInputParams(required: boolean): Param[] {
  return [
    {
      key: "title",
      label: "Title",
      type: "string",
      required,
      hint: "Must be a non-empty, single-line string.",
    },
    {
      key: "timezone",
      label: "Default timezone",
      type: "string",
      default: "America/Los_Angeles",
      hint: "IANA name from List Timezones. The default timezone for events created on this " +
        "calendar.",
    },
    {
      key: "weekdayBegin",
      label: "Week starts on",
      type: "select",
      default: "sunday",
      advanced: true,
      options: [
        { value: "sunday", label: "Sunday" },
        { value: "monday", label: "Monday" },
      ],
      hint: "Wire field weekday_begin.",
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      hint: "Plain text or simplified HTML, shown on the calendar landing page.",
    },
    {
      key: "internalName",
      label: "Internal name",
      type: "string",
      advanced: true,
      hint: "Wire field internal_name. Not shown publicly.",
    },
    {
      key: "calendarColor",
      label: "Color",
      type: "number",
      default: 1,
      advanced: true,
      validation: { integer: true, min: 1, max: 20 },
      hint: "Wire field calendar_color. 1-20, corresponding to the dashboard color palette.",
    },
    {
      key: "landingPageTemplateId",
      label: "Landing page template ID",
      type: "string",
      default: "default",
      advanced: true,
      hint: 'Wire field landing_page_template_id. "default" uses AddEvent\'s standard template, ' +
        "or an id from List Calendar Templates.",
    },
    {
      key: "embeddableCalendarTemplateId",
      label: "Embeddable calendar template ID",
      type: "string",
      default: "default",
      advanced: true,
      hint: 'Wire field embeddable_calendar_template_id. "default" uses AddEvent\'s standard ' +
        "template, or an id from List Calendar Templates.",
    },
    {
      key: "customData",
      label: "Custom data",
      type: "json",
      advanced: true,
      hint: "Wire field custom_data. Arbitrary key-value pairs, e.g. an external id linking this " +
        "calendar to another system.",
    },
  ];
}

export interface CalendarInput {
  title?: string;
  timezone?: string;
  weekdayBegin?: string;
  description?: string;
  internalName?: string;
  calendarColor?: number;
  landingPageTemplateId?: string;
  embeddableCalendarTemplateId?: string;
  customData?: Record<string, unknown>;
}

export function calendarInputBody(input: CalendarInput): Record<string, unknown> {
  return compactBody({
    title: input.title,
    timezone: input.timezone,
    weekday_begin: input.weekdayBegin,
    description: input.description,
    internal_name: input.internalName,
    calendar_color: input.calendarColor,
    landing_page_template_id: input.landingPageTemplateId,
    embeddable_calendar_template_id: input.embeddableCalendarTemplateId,
    custom_data: input.customData,
  });
}

/** The full `attendee-input` field set, shared by Create and Update RSVP Attendee. */
export function attendeeInputParams(required: boolean): Param[] {
  return [
    {
      key: "email",
      label: "Email",
      type: "string",
      required,
      hint: "Update and reminder emails about the event are sent here. Must be unique per event.",
    },
    {
      key: "attending",
      label: "Response",
      type: "select",
      default: "going",
      options: attendingOptions,
    },
    {
      key: "notify",
      label: "Send notification emails",
      type: "boolean",
      advanced: true,
      hint: "Off by default: creating an attendee via the API sends no email. Turn this on to " +
        "send the attendee confirmation email (if enabled for the event) and the organizer " +
        'notification email (if notify_frequency is "all"). Maps to the wire value notify=active.',
    },
    {
      key: "rsvpFormData",
      label: "RSVP form data",
      type: "json",
      hint: "Wire field rsvp_form_data. The default RSVP form requires a name field here — see " +
        "List RSVP Forms for a custom form's fields.",
    },
  ];
}

export interface AttendeeInput {
  email?: string;
  attending?: string;
  notify?: boolean;
  rsvpFormData?: Record<string, unknown>;
}

export function attendeeInputBody(input: AttendeeInput): Record<string, unknown> {
  return compactBody({
    email: input.email,
    attending: input.attending,
    notify: input.notify ? "active" : undefined,
    rsvp_form_data: input.rsvpFormData,
  });
}

/** Drop `undefined` values so an update body only carries fields the caller set. */
function compactBody(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
