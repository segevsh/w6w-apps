import type { ActionDefinition } from "@w6w/types";
import { asFlag, asNumber, asText, HostawayClient } from "../lib/client.ts";

/**
 * List reservations. Wraps `GET /v1/reservations`.
 *
 * Documented query parameters, verbatim (only the subset below is exposed — the table
 * also has `afterId`, `assigneeUserId`, `customerUserId`, `isStarred`, `isArchived`,
 * `isPinned`, `latestActivityStart`/`End`, `reservationAgreement` and the
 * cancellation-policy opt-ins; see the README):
 *
 *   - `limit` — "Maximum number of items in the list (default limit is 100)."
 *   - `offset` — "Deprecated... Please migrate to cursor-based pagination using afterId
 *     instead, as offset-based pagination has poor performance for large datasets."
 *   - `sortOrder` — "One of: arrivalDate, arrivalDateDesc, lastConversationMessageSent,
 *     lastConversationMessageSentDesc, lastConversationMessageReceived,
 *     lastConversationMessageReceivedDesc, latestActivity, latestActivityDesc, updatedOn."
 *   - `match` — "Used to search a reservation by guest name."
 *   - `dateType` — "Selects which reservation date startDate and endDate apply to. One
 *     of: arrival, departure, creation, cancellation."
 *   - `startDate` / `endDate` — "Lower/Upper bound (inclusive) for the date selected by
 *     dateType. Can be sent without endDate/startDate. Ignored when dateType is not set."
 *   - `includeResources` — "if includeResources flag is 1 then response object is
 *     supplied with supplementary resources, default is 0." Per the docs' "Changing
 *     behavior of returning attached objects" section, without it a listed reservation's
 *     `customFieldValues`, `reservationFees`, `reservationUnit` and `hostProxyEmail`
 *     come back empty — they are always included on Retrieve-a-reservation.
 *
 * `arrivalStartDate`/`arrivalEndDate`/`departureStartDate`/`departureEndDate` are also
 * documented; `dateType` + `startDate`/`endDate` is the documented general form of the
 * same filter and is what this action exposes.
 */
const action: ActionDefinition = {
  key: "list-reservations",
  type: "search",
  resource: "reservation",
  title: "List reservations",
  description: "List reservations, filtered by listing, channel, guest name or a date range.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 100, hint: "Default 100." },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 0,
      hint: "Deprecated by Hostaway in favour of afterId cursor paging, but still honoured.",
    },
    { key: "listingId", label: "Listing ID", type: "number" },
    { key: "channelId", label: "Channel ID", type: "number" },
    { key: "match", label: "Guest name search", type: "string" },
    {
      key: "dateType",
      label: "Date type",
      type: "select",
      hint: "Selects which date startDate/endDate apply to.",
      options: [
        { value: "", label: "No date filter" },
        { value: "arrival", label: "Arrival" },
        { value: "departure", label: "Departure" },
        { value: "creation", label: "Creation" },
        { value: "cancellation", label: "Cancellation" },
      ],
    },
    {
      key: "startDate",
      label: "Start date",
      type: "date",
      hint: "Inclusive. Ignored without a date type.",
    },
    {
      key: "endDate",
      label: "End date",
      type: "date",
      hint: "Inclusive. Ignored without a date type.",
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [
        { value: "", label: "Hostaway default" },
        { value: "arrivalDate", label: "Arrival date" },
        { value: "arrivalDateDesc", label: "Arrival date, descending" },
        { value: "latestActivity", label: "Latest activity" },
        { value: "latestActivityDesc", label: "Latest activity, descending" },
        { value: "updatedOn", label: "Last updated" },
      ],
    },
    {
      key: "hasUnreadConversationMessages",
      label: "Has unread messages",
      type: "boolean",
    },
    {
      key: "includeResources",
      label: "Include resources",
      type: "boolean",
      hint: "Without this, customFieldValues, reservationFees, reservationUnit and " +
        "hostProxyEmail come back empty.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Reservations" },
    { key: "count", type: "number", label: "Total matching reservations" },
    { key: "page", type: "number", label: "Page number" },
    { key: "totalPages", type: "number", label: "Total pages" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    return await new HostawayClient(ctx).requestPage("/reservations", {
      query: {
        limit: asNumber(p.limit),
        offset: asNumber(p.offset),
        listingId: asNumber(p.listingId),
        channelId: asNumber(p.channelId),
        match: asText(p.match),
        dateType: asText(p.dateType),
        startDate: asText(p.startDate),
        endDate: asText(p.endDate),
        sortOrder: asText(p.sortOrder),
        hasUnreadConversationMessages: asFlag(p.hasUnreadConversationMessages),
        includeResources: asNumber(p.includeResources),
      },
    });
  },
};

export default action;
