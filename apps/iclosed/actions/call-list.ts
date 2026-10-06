import type { ActionDefinition } from "@w6w/types";
import { IClosedClient } from "../lib/client.ts";

/**
 * `GET /v1/eventCalls` — List booked calls with filters. Returns data.eventCalls and data.count.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  ids?: string;
  contactId?: number;
  eventType?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  createdAtStart?: string;
  createdAtEnd?: string;
  location?: string;
  orderColumn?: string;
  orderBy?: string;
  limit?: number;
  page?: number;
  userIds?: string;
  eventIds?: string;
  types?: string;
  inviteeEmails?: string;
  outcomes?: string;
  noSaleReason?: string;
  utmKeys?: string;
  utmValues?: string;
  callTypes?: string;
  setterIds?: string;
}

const callList: ActionDefinition<Input> = {
  key: "call-list",
  type: "read",
  resource: "call",
  title: "List calls",
  description: "List booked calls with filters. Returns data.eventCalls and data.count.",
  params: [
    {
      key: "ids",
      label: "Call IDs",
      type: "string",
      hint: "Comma-separated.",
    },
    {
      key: "contactId",
      label: "Contact ID",
      type: "number",
      validation: { integer: true },
    },
    {
      key: "eventType",
      label: "Time window",
      type: "select",
      options: [{ value: "PAST", label: "Past" }, { value: "UPCOMING", label: "Upcoming" }, {
        value: "ALL",
        label: "All",
      }],
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Invitee name, email or phone.",
    },
    {
      key: "dateFrom",
      label: "Date from",
      type: "string",
      hint: "Inclusive.",
    },
    {
      key: "dateTo",
      label: "Date to",
      type: "string",
      hint: "Inclusive.",
    },
    {
      key: "createdAtStart",
      label: "Created from",
      type: "string",
      hint: "Inclusive.",
    },
    {
      key: "createdAtEnd",
      label: "Created to",
      type: "string",
      hint: "Inclusive.",
    },
    {
      key: "location",
      label: "Locations",
      type: "string",
      hint: "Comma-separated, e.g. PHONE_CALL,GOOGLE_MEET.",
    },
    {
      key: "orderColumn",
      label: "Order column",
      type: "select",
      options: [
        { value: "createdAt", label: "createdAt" },
        { value: "dateTime", label: "dateTime" },
        { value: "updatedAt", label: "updatedAt" },
        { value: "id", label: "id" },
      ],
    },
    {
      key: "orderBy",
      label: "Order direction",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
      hint: "Required together with Order column.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true },
      hint: "Records per page (the docs state a maximum of 100).",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true },
      hint: "Zero-based page index. Default 0.",
    },
    {
      key: "userIds",
      label: "User IDs",
      type: "string",
      hint: "Comma-separated.",
    },
    {
      key: "eventIds",
      label: "Event IDs",
      type: "string",
      hint: "Comma-separated.",
    },
    {
      key: "types",
      label: "Types",
      type: "string",
      hint: "Comma-separated: rescheduled_events, cancelled_events, scheduled_events.",
    },
    {
      key: "inviteeEmails",
      label: "Invitee emails",
      type: "string",
      hint: "Comma-separated.",
    },
    {
      key: "outcomes",
      label: "Outcomes",
      type: "string",
      hint: "Comma-separated, e.g. WON, NO_SALE, QUALIFIED.",
    },
    {
      key: "noSaleReason",
      label: "No-sale reasons",
      type: "string",
      hint: "Comma-separated.",
    },
    {
      key: "utmKeys",
      label: "UTM keys",
      type: "string",
      hint: "Comma-separated.",
    },
    {
      key: "utmValues",
      label: "UTM values",
      type: "string",
      hint: "Comma-separated.",
    },
    {
      key: "callTypes",
      label: "Call types",
      type: "string",
      hint: "Comma-separated: STRATEGY_EVENT, DISCOVERY_EVENT.",
    },
    {
      key: "setterIds",
      label: "Setter IDs",
      type: "string",
      hint: "Comma-separated.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "{eventCalls[], count}" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/eventCalls", {
      query: {
        ids: input.ids,
        contactId: input.contactId,
        eventType: input.eventType,
        search: input.search,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        createdAtStart: input.createdAtStart,
        createdAtEnd: input.createdAtEnd,
        location: input.location,
        orderColumn: input.orderColumn,
        orderBy: input.orderBy,
        limit: input.limit,
        page: input.page,
        userIds: input.userIds,
        eventIds: input.eventIds,
        types: input.types,
        inviteeEmails: input.inviteeEmails,
        outcomes: input.outcomes,
        noSaleReason: input.noSaleReason,
        utmKeys: input.utmKeys,
        utmValues: input.utmValues,
        callTypes: input.callTypes,
        setterIds: input.setterIds,
      },
    });
  },
};

export default callList;
