import type { ActionDefinition } from "@w6w/types";
import { HospitableClient, listValue } from "../lib/client.ts";
import { includeParam, PAGED, PAGED_OUTPUT, PROPERTY_IDS } from "../lib/params.ts";

/** `GET /v2/reservations` — List reservations for one or more properties. */
interface Input {
  property_ids: unknown;
  start_date?: string;
  end_date?: string;
  date_query?: string;
  platform_id?: string;
  conversation_id?: string;
  last_message_at?: string;
  booked_at?: string;
  sort_by?: string;
  sort_direction?: string;
  statuses?: unknown;
  platforms?: unknown;
  include?: string;
  page?: number;
  per_page?: number;
}

const reservationList: ActionDefinition<Input> = {
  key: "reservation-list",
  type: "search",
  resource: "reservation",
  title: "List Reservations",
  description:
    "List reservations for the given properties. With none of start/end date, booked-at, conversation or reservation code set, the vendor defaults to check-ins in the next 2 weeks.",
  params: [
    PROPERTY_IDS,
    { key: "start_date", label: "Start date", type: "date", hint: "YYYY-MM-DD; see Date field." },
    { key: "end_date", label: "End date", type: "date", hint: "YYYY-MM-DD; see Date field." },
    {
      key: "date_query",
      label: "Date field",
      type: "select",
      hint: "Which date Start/End date filter on.",
      options: [
        { value: "checkin", label: "Check-in" },
        { value: "checkout", label: "Check-out" },
        { value: "booked_at", label: "Booking date" },
      ],
    },
    {
      key: "platform_id",
      label: "Reservation code",
      type: "string",
      hint: "Exact match on the platform's reservation code.",
    },
    {
      key: "conversation_id",
      label: "Conversation UUID",
      type: "string",
      hint: "Only reservations of this inbox conversation.",
    },
    {
      key: "last_message_at",
      label: "Last message after",
      type: "datetime",
      hint: "Reservations whose last message is after this time.",
    },
    {
      key: "booked_at",
      label: "Booked after",
      type: "datetime",
      hint: "Reservations booked after this time. Alone, it switches off the 2-week default.",
    },
    {
      key: "sort_by",
      label: "Sort by",
      type: "select",
      options: [{ value: "start_date", label: "Start date" }, {
        value: "booked_at",
        label: "Booking date",
      }],
    },
    {
      key: "sort_direction",
      label: "Sort direction",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
    },
    {
      key: "statuses",
      label: "Statuses",
      type: "text",
      hint: "Comma separated: request, accepted, cancelled, not_accepted, checkpoint.",
    },
    {
      key: "platforms",
      label: "Platforms",
      type: "text",
      hint: "Comma separated: airbnb, homeaway, booking, agoda, ical, manual, direct.",
    },
    includeParam(
      "guest, user, financials, listings, properties, review, tasks, smartlock_code",
      "Several need scopes (financials:read, listing:read, property:read, reviews:read, task:read).",
    ),
    ...PAGED,
  ],
  output: PAGED_OUTPUT,

  execute(input, ctx) {
    const query: Record<string, string | number | string[] | undefined> = {
      "properties[]": listValue(input.property_ids),
      start_date: input.start_date,
      end_date: input.end_date,
      date_query: input.date_query,
      platform_id: input.platform_id,
      conversation_id: input.conversation_id,
      last_message_at: input.last_message_at,
      booked_at: input.booked_at,
      "status[]": listValue(input.statuses),
      "platforms[]": listValue(input.platforms),
      include: input.include,
      page: input.page,
      per_page: input.per_page,
    };
    if (input.sort_by) {
      query[`sort[${input.sort_direction === "desc" ? "desc" : "asc"}]`] = input.sort_by;
    }
    return new HospitableClient(ctx).request("GET", "/reservations", { query });
  },
};

export default reservationList;
