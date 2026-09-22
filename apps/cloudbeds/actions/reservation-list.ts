import type { ActionDefinition } from "@w6w/types";
import { CloudbedsClient, type CloudbedsEnvelope } from "../lib/client.ts";
import { paginationParams, reservationStatusOptions } from "../lib/params.ts";

/**
 * `GET /getReservations` — search reservations.
 *
 * Every parameter on this operation is optional, which is the whole design
 * problem: called with nothing it returns the property's reservations a page at
 * a time (100 per page by default), and every narrowing is a filter the caller
 * supplies. They are grouped here the way the vendor groups them — window
 * filters on one side, guest/room/source filters on the other — with the
 * rarely-used tail collapsed under "Additional parameters".
 *
 * Three details are worth reading before writing a sync against it:
 *
 *  - The date windows mean different things. `resultsFrom`/`resultsTo` filter on
 *    the **booking** date, `modifiedFrom`/`modifiedTo` on the modification date,
 *    and `checkInFrom`/`checkInTo`/`checkOutFrom`/`checkOutTo` on the stay.
 *    `datesQueryMode` decides whether the room-level dates or the booking's own
 *    dates are used ("booking" is the API's default). A nightly sync wants
 *    `modifiedFrom`; a "who is arriving tomorrow" report wants `checkInFrom`.
 *  - `includeGuestRequirements` only does anything when
 *    `includeGuestsDetails` is also on — the vendor states that dependency.
 *  - `roomID` and `roomName` require check-in/check-out dates or a `status`.
 *
 * `pageSize` is capped at 100 by the vendor.
 */
interface Input {
  propertyID?: string;
  status?: string;
  resultsFrom?: string;
  resultsTo?: string;
  modifiedFrom?: string;
  modifiedTo?: string;
  checkInFrom?: string;
  checkInTo?: string;
  checkOutFrom?: string;
  checkOutTo?: string;
  datesQueryMode?: string;
  roomID?: string;
  roomName?: string;
  roomTypeID?: string;
  includeGuestsDetails?: boolean;
  includeGuestRequirements?: boolean;
  includeCustomFields?: boolean;
  includeAllRooms?: boolean;
  sourceId?: string;
  sourceReservationId?: string;
  ratePlanId?: string;
  firstName?: string;
  lastName?: string;
  guestID?: string;
  allotmentBlockCode?: string;
  groupCode?: string;
  sortByRecent?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

/** The date-window filters, declared once because there are eight of them. */
const windowParams = [
  {
    key: "resultsFrom",
    label: "Booked from",
    type: "datetime",
    advanced: true,
    hint: "Lower limit on the booking date (when the reservation was created).",
  },
  {
    key: "resultsTo",
    label: "Booked to",
    type: "datetime",
    advanced: true,
    hint: "Upper limit on the booking date.",
  },
  {
    key: "modifiedFrom",
    label: "Modified from",
    type: "datetime",
    advanced: true,
    hint: "Lower limit on the modification date — the right filter for an incremental sync.",
  },
  {
    key: "modifiedTo",
    label: "Modified to",
    type: "datetime",
    advanced: true,
    hint: "Upper limit on the modification date.",
  },
  {
    key: "checkInFrom",
    label: "Check-in from",
    type: "date",
    advanced: true,
    hint: "Only reservations whose stay starts on or after this day.",
  },
  {
    key: "checkInTo",
    label: "Check-in to",
    type: "date",
    advanced: true,
    hint: "Only reservations whose stay starts on or before this day.",
  },
  {
    key: "checkOutFrom",
    label: "Check-out from",
    type: "date",
    advanced: true,
    hint: "Only reservations whose stay ends on or after this day.",
  },
  {
    key: "checkOutTo",
    label: "Check-out to",
    type: "date",
    advanced: true,
    hint: "Only reservations whose stay ends on or before this day.",
  },
] as const;

const reservationList: ActionDefinition<Input> = {
  key: "reservation-list",
  type: "search",
  resource: "reservation",
  title: "Search Reservations",
  description:
    "Search reservations by status, date window, room, guest or source. Every filter is optional.",
  params: [
    {
      key: "propertyID",
      label: "Properties",
      type: "string",
      placeholder: "37,345,89",
      advanced: true,
      hint: "Comma-separated property IDs, even though the parameter is singular. Omit for the " +
        "credential's own property (or every property of an association).",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: reservationStatusOptions,
      hint: "Filter by the reservation's current state. Leave empty for every state.",
    },
    ...windowParams,
    {
      key: "datesQueryMode",
      label: "Date mode",
      type: "select",
      advanced: true,
      options: [
        { value: "booking", label: "Booking dates (API default)" },
        { value: "rooms", label: "Each room's own dates" },
      ],
      hint: "Which dates the check-in/check-out filters compare against. A booking whose rooms " +
        "were moved can differ from the booking's own start/end dates.",
    },
    {
      key: "roomID",
      label: "Room ID",
      type: "string",
      advanced: true,
      hint: "Requires check-in/check-out dates or a status. A date range spanning more than one " +
        "day can return more than one reservation.",
    },
    {
      key: "roomName",
      label: "Room name",
      type: "string",
      advanced: true,
      hint: "The property-customised room name. Same requirement as the room ID.",
    },
    {
      key: "roomTypeID",
      label: "Room type ID",
      type: "string",
      advanced: true,
    },
    {
      key: "guestID",
      label: "Guest ID",
      type: "string",
      advanced: true,
      hint: "Matches the reservation whether the guest is the primary one or an additional guest.",
    },
    {
      key: "firstName",
      label: "Guest first name",
      type: "string",
      advanced: true,
      hint: "Filters on the primary guest's first name.",
    },
    {
      key: "lastName",
      label: "Guest last name",
      type: "string",
      advanced: true,
      hint: "Filters on the primary guest's last name.",
    },
    {
      key: "sourceId",
      label: "Source ID",
      type: "string",
      advanced: true,
    },
    {
      key: "sourceReservationId",
      label: "Source reservation ID",
      type: "string",
      advanced: true,
      hint: "The reservation's id in the channel it came from, not Cloudbeds' own.",
    },
    {
      key: "ratePlanId",
      label: "Rate plan ID",
      type: "string",
      advanced: true,
    },
    {
      key: "allotmentBlockCode",
      label: "Allotment block code",
      type: "string",
      advanced: true,
    },
    {
      key: "groupCode",
      label: "Group code",
      type: "string",
      advanced: true,
    },
    {
      key: "includeGuestsDetails",
      label: "Include guest details",
      type: "boolean",
      advanced: true,
      hint: "Off by default. Required before `includeGuestRequirements` does anything.",
    },
    {
      key: "includeGuestRequirements",
      label: "Include guest requirements",
      type: "boolean",
      advanced: true,
      hint: "Needs `includeGuestsDetails` to be on as well, per the vendor.",
    },
    {
      key: "includeCustomFields",
      label: "Include custom fields",
      type: "boolean",
      advanced: true,
    },
    {
      key: "includeAllRooms",
      label: "Include all rooms",
      type: "boolean",
      advanced: true,
      hint: "Adds a `rooms` field that merges assigned and unassigned rooms.",
    },
    {
      key: "sortByRecent",
      label: "Most recent first",
      type: "boolean",
      advanced: true,
      hint: "Sort by most recent action instead of the API's default order.",
    },
    ...paginationParams(100, "Results per page. Defaults to 100, which is also the maximum."),
  ],
  output: [
    { key: "data", type: "array", label: "Reservations" },
    { key: "count", type: "number", label: "Reservations in this page" },
    { key: "total", type: "number", label: "Total matching reservations" },
  ],

  execute(input, ctx) {
    return new CloudbedsClient(ctx).request<CloudbedsEnvelope<unknown[]>>("/getReservations", {
      query: {
        propertyID: input.propertyID,
        status: input.status,
        resultsFrom: input.resultsFrom,
        resultsTo: input.resultsTo,
        modifiedFrom: input.modifiedFrom,
        modifiedTo: input.modifiedTo,
        checkInFrom: input.checkInFrom,
        checkInTo: input.checkInTo,
        checkOutFrom: input.checkOutFrom,
        checkOutTo: input.checkOutTo,
        datesQueryMode: input.datesQueryMode,
        roomID: input.roomID,
        roomName: input.roomName,
        roomTypeID: input.roomTypeID,
        includeGuestsDetails: input.includeGuestsDetails,
        includeGuestRequirements: input.includeGuestRequirements,
        includeCustomFields: input.includeCustomFields,
        includeAllRooms: input.includeAllRooms,
        sourceId: input.sourceId,
        sourceReservationId: input.sourceReservationId,
        ratePlanId: input.ratePlanId,
        firstName: input.firstName,
        lastName: input.lastName,
        guestID: input.guestID,
        allotmentBlockCode: input.allotmentBlockCode,
        groupCode: input.groupCode,
        sortByRecent: input.sortByRecent,
        pageNumber: input.pageNumber,
        pageSize: input.pageSize,
      },
    });
  },
};

export default reservationList;
