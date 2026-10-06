import type { OutputField } from "@w6w/types";
import { API_URL, seg, strList } from "./client.ts";
import {
  COMMON_FIELDS,
  COMMON_OUTPUT,
  type Field,
  NAME_FIELD,
  ORIGIN_FIELD,
  type PageResource,
  TAG_LIST_FIELD,
  TITLE_FIELD,
} from "./pages.ts";

const FILTER_PAGES = "identifier, created_date, modified_date, origin_system, title";

const out = (...extra: OutputField[]): OutputField[] => [...COMMON_OUTPUT, ...extra];

export const PETITION: PageResource = {
  slug: "petition",
  label: "Petition",
  plural: "Petitions",
  path: "/petitions",
  idKey: "petitionId",
  filterFields: FILTER_PAGES,
  createNote:
    "API-created petitions have no public page on actionnetwork.org, send no autoresponse and have no manage page; they appear in targeting once they have a signature.",
  fields: [
    ...COMMON_FIELDS,
    {
      key: "petitionText",
      api: "petition_text",
      param: { label: "Petition text", type: "text", hint: "The letter sent to the target." },
    },
    {
      key: "targets",
      api: "target",
      build: (v) => strList(v)?.map((name) => ({ name })),
      param: {
        label: "Targets",
        type: "array",
        item: { type: "string" },
        hint: "Names of the people the petition is addressed to.",
      },
    },
  ],
  output: out(
    { key: "petition_text", type: "string", label: "Letter to the target" },
    { key: "total_signatures", type: "number", label: "Signature count" },
    { key: "target", type: "array", label: "Targets: { name }" },
  ),
};

const LOCATION: Field[] = [
  {
    key: "venue",
    api: "venue",
    into: "location",
    param: { label: "Venue", type: "string", hint: "e.g. Jane White Hall." },
  },
  {
    key: "addressLine",
    api: "address_lines",
    into: "location",
    build: (v) => [String(v)],
    param: { label: "Street address", type: "string", hint: "Only the first line is kept." },
  },
  { key: "locality", api: "locality", into: "location", param: { label: "City", type: "string" } },
  {
    key: "region",
    api: "region",
    into: "location",
    param: { label: "State / region", type: "string", hint: "ISO 3166-2 code." },
  },
  {
    key: "postalCode",
    api: "postal_code",
    into: "location",
    param: { label: "Postal code", type: "string" },
  },
  {
    key: "country",
    api: "country",
    into: "location",
    param: { label: "Country", type: "string", hint: "ISO 3166-1 alpha-2. Defaults to US." },
  },
];

export const EVENT_FIELDS: Field[] = [
  ...COMMON_FIELDS,
  {
    key: "instructions",
    api: "instructions",
    param: { label: "Instructions", type: "text", hint: "Shown after RSVP. May contain HTML." },
  },
  {
    key: "startDate",
    api: "start_date",
    param: {
      label: "Start",
      type: "datetime",
      hint: "Read as local time at the event's location.",
    },
  },
  {
    key: "endDate",
    api: "end_date",
    param: { label: "End", type: "datetime", hint: "Read as local time at the event's location." },
  },
  ...LOCATION,
  {
    key: "status",
    api: "status",
    param: {
      label: "Status",
      type: "select",
      options: [
        { value: "confirmed", label: "Confirmed" },
        { value: "tentative", label: "Tentative" },
        { value: "cancelled", label: "Cancelled" },
        { value: "pending_approval", label: "Pending approval" },
      ],
      hint:
        "pending_approval is for events in an event campaign with vetting; most events are confirmed.",
    },
  },
  {
    key: "visibility",
    api: "visibility",
    param: {
      label: "Visibility",
      type: "select",
      options: [{ value: "public", label: "Public" }, { value: "private", label: "Private" }],
    },
  },
  {
    key: "capacity",
    api: "capacity",
    param: { label: "Capacity", type: "number", validation: { min: 1, integer: true } },
  },
  {
    key: "guestsCanInviteOthers",
    api: "guests_can_invite_others",
    param: { label: "Guests can invite others", type: "boolean" },
  },
];

export const EVENT_OUTPUT: OutputField[] = out(
  { key: "instructions", type: "string", label: "Instructions (HTML)" },
  { key: "start_date", type: "string", label: "Start" },
  { key: "end_date", type: "string", label: "End" },
  { key: "location", type: "object", label: "Venue, address and geocoded position" },
  { key: "status", type: "string", label: "confirmed, tentative, cancelled or pending_approval" },
  { key: "visibility", type: "string", label: "public or private" },
  { key: "capacity", type: "number", label: "RSVP cap" },
  { key: "total_accepted", type: "number", label: "RSVP count" },
);

export const EVENT: PageResource = {
  slug: "event",
  label: "Event",
  plural: "Events",
  path: "/events",
  idKey: "eventId",
  filterFields: `${FILTER_PAGES}, start_date, end_date`,
  createNote:
    "API-created events have no public page, send no autoresponse or reminders and have no manage page; they appear in targeting once they have an RSVP.",
  fields: EVENT_FIELDS,
  output: EVENT_OUTPUT,
};

export const FORM: PageResource = {
  slug: "form",
  label: "Form",
  plural: "Forms",
  path: "/forms",
  idKey: "formId",
  filterFields: FILTER_PAGES,
  createNote: "API-created forms have no public page; submissions are recorded through the API.",
  fields: [
    ...COMMON_FIELDS,
    {
      key: "callToAction",
      api: "call_to_action",
      param: { label: "Call to action", type: "string", hint: "e.g. Tell your story." },
    },
  ],
  output: out(
    { key: "call_to_action", type: "string", label: "Call to action" },
    { key: "total_submissions", type: "number", label: "Submission count" },
  ),
};

export const FUNDRAISING_PAGE: PageResource = {
  slug: "fundraising-page",
  label: "Fundraising Page",
  plural: "Fundraising Pages",
  path: "/fundraising_pages",
  idKey: "fundraisingPageId",
  filterFields: FILTER_PAGES,
  createNote:
    "An API-created page takes no payments itself; donations are recorded against it with Record Donation.",
  fields: COMMON_FIELDS,
  output: out(
    { key: "total_donations", type: "number", label: "Donation count" },
    { key: "total_amount", type: "string", label: "Total raised" },
    { key: "currency", type: "string", label: "Currency" },
  ),
};

export const ADVOCACY_CAMPAIGN: PageResource = {
  slug: "advocacy-campaign",
  label: "Advocacy Campaign",
  plural: "Advocacy Campaigns",
  path: "/advocacy_campaigns",
  idKey: "advocacyCampaignId",
  filterFields: FILTER_PAGES,
  createNote: "A letter (email) or call (phone) campaign that outreaches are recorded against.",
  fields: [
    ...COMMON_FIELDS,
    {
      key: "type",
      api: "type",
      update: false,
      param: {
        label: "Type",
        type: "select",
        options: [{ value: "email", label: "Email (letter campaign)" }, {
          value: "phone",
          label: "Phone (call campaign)",
        }],
        hint: "How activists reach the targets. Fixed once created.",
      },
    },
    {
      key: "targets",
      api: "targets",
      param: {
        label: "Target universe",
        type: "string",
        hint: "e.g. U.S. Congress.",
      },
    },
  ],
  output: out(
    { key: "type", type: "string", label: "email or phone" },
    { key: "targets", type: "string", label: "Target universe" },
    { key: "total_outreaches", type: "number", label: "Outreach count" },
  ),
};

export const EVENT_CAMPAIGN: PageResource = {
  slug: "event-campaign",
  label: "Event Campaign",
  plural: "Event Campaigns",
  path: "/event_campaigns",
  idKey: "eventCampaignId",
  filterFields: FILTER_PAGES,
  createNote: "Groups events under one heading; add events with Create Event in Event Campaign.",
  fields: [
    ...COMMON_FIELDS,
    {
      key: "hostPitch",
      api: "host_pitch",
      param: { label: "Host pitch", type: "text", hint: "Shown to people signing up to host." },
    },
    {
      key: "hostInstructions",
      api: "host_instructions",
      param: {
        label: "Host instructions",
        type: "text",
        hint: "Shown to hosts after they create an event. May contain HTML.",
      },
    },
  ],
  output: out(
    { key: "host_pitch", type: "string", label: "Host pitch" },
    { key: "host_instructions", type: "string", label: "Host instructions (HTML)" },
    { key: "host_url", type: "string", label: "Where hosts create events" },
    { key: "total_events", type: "number", label: "Event count" },
    { key: "total_rsvps", type: "number", label: "RSVP count" },
  ),
};

/**
 * Messages are mass emails. Unlike every other resource they replicate the UI: create, target,
 * schedule and send are all available. `subject`, `from`, `body` and `reply_to` are all required.
 */
export const MESSAGE: PageResource = {
  slug: "message",
  label: "Message",
  plural: "Messages",
  path: "/messages",
  idKey: "messageId",
  createNote:
    "Creating starts targeting at once, so the message sits in `calculating` until it returns to `draft`; poll Get Message. The vendor allows ONE create per 30 seconds and rejects faster ones with a rate-limit error.",
  fields: [
    { ...ORIGIN_FIELD, create: "optional" },
    NAME_FIELD,
    {
      ...TITLE_FIELD,
      key: "subject",
      api: "subject",
      param: { label: "Subject line", type: "string" },
    },
    {
      key: "from",
      api: "from",
      create: "required",
      param: { label: "From line", type: "string", hint: "e.g. Progressive Action Now." },
    },
    {
      key: "replyTo",
      api: "reply_to",
      create: "required",
      param: { label: "Reply-to email", type: "string" },
    },
    {
      key: "body",
      api: "body",
      create: "required",
      param: { label: "Body", type: "text", hint: "HTML. Visual-editor emails only." },
    },
    {
      key: "queryIds",
      api: "targets",
      build: (v) => strList(v)?.map((id) => ({ href: `${API_URL}/queries/${seg(id)}` })),
      param: {
        label: "Target query IDs",
        type: "array",
        item: { type: "string" },
        hint:
          "Saved queries to include (see List Queries). Empty targets the whole list. Changing them re-runs targeting and is limited to one change per 30 seconds.",
      },
    },
    {
      key: "wrapperId",
      api: "_links",
      update: false,
      build: (v) => ({ "osdi:wrapper": { href: `${API_URL}/wrappers/${seg(v)}` } }),
      param: {
        label: "Wrapper ID",
        type: "string",
        hint:
          "Email wrapper to use (see List Wrappers). Without one the account's default wrapper applies. Set at creation only.",
      },
    },
    TAG_LIST_FIELD,
  ],
  output: [
    { key: "id", type: "string", label: "Action Network id (UUID)" },
    { key: "name", type: "string", label: "Administrative name" },
    { key: "subject", type: "string", label: "Subject line" },
    { key: "from", type: "string", label: "From line" },
    { key: "reply_to", type: "string", label: "Reply-to email" },
    {
      key: "status",
      type: "string",
      label: "draft, calculating, sending, sending_by_timezone, throttled, scheduled or sent",
    },
    { key: "total_targeted", type: "number", label: "People targeted" },
    { key: "scheduled_start_date", type: "string", label: "Scheduled send (UTC)" },
    { key: "sent_start_date", type: "string", label: "Send started (UTC)" },
    {
      key: "statistics",
      type: "object",
      label: "sent, opened, clicked, actions, unsubscribed, ...",
    },
    { key: "targets", type: "array", label: "Included queries: { href }" },
    { key: "tag_list", type: "array", label: "Tag names" },
  ],
};
