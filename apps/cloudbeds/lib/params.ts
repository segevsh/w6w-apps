import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Cloudbeds actions.
 *
 * Every key here is the vendor's own spelling, taken from the parameter list
 * of the operation named in each doc comment — `propertyID` here, `propertyIDs`
 * there, `pageNumber`/`pageSize` everywhere. Cloudbeds is case-sensitive about
 * them (`sourceId` is camelCase on `getReservations` while `reservationID` is
 * not), so a "tidied" key is a silently ignored filter rather than an error.
 *
 * All of these are optional at the type level except where an operation's own
 * OpenAPI `required` list says otherwise; see each action for those.
 */

/**
 * `propertyID` — a single property.
 *
 * Omit it and the token's own property is used: "It can be omitted if the API
 * key is single-property", which is also how `getHotelDetails` is documented.
 */
export const propertyIdParam: Param = {
  key: "propertyID",
  label: "Property",
  type: "string",
  hint: "Cloudbeds property ID. Omit to use the property the credential belongs to.",
};

/**
 * `propertyIDs` — the comma-separated plural the list operations take.
 *
 * Not a `multiselect`: the vendor documents one comma-separated string
 * ("i.e. 37,345,89") and repeating the key is not the same request.
 */
export const propertyIdsParam: Param = {
  key: "propertyIDs",
  label: "Properties",
  type: "string",
  placeholder: "37,345,89",
  advanced: true,
  hint: "Comma-separated property IDs. Omit to use the credential's own property — or every " +
    "property of the association, for a multi-property credential.",
};

/**
 * `pageNumber` / `pageSize`.
 *
 * Both are optional and both have a vendor default (stated per operation in the
 * hint below), so nothing is prefilled here: leaving them empty is exactly the
 * vendor's own default, and a caller who wants a different page says so.
 * `pageSize` is capped at 100 on every operation that documents a cap.
 */
export function paginationParams(defaultPageSize: number, hint?: string): Param[] {
  return [
    {
      key: "pageNumber",
      label: "Page number",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "1-based. Defaults to 1.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      validation: { integer: true, min: 1, max: 100 },
      hint: hint ??
        `Rows per page. Defaults to ${defaultPageSize}; 100 is the maximum on every operation ` +
          "that documents one.",
    },
  ];
}

/**
 * `startDate` / `endDate` — check-in and check-out.
 *
 * The vendor's format is `YYYY-MM-DD` and the fields are required on
 * `getAvailableRoomTypes` and `getRatePlans`, optional (but rate-defining) on
 * `getRoomTypes`, so their requiredness is set at the call site.
 */
export const startDateParam: Param = {
  key: "startDate",
  label: "Check-in date",
  type: "date",
  hint: "Format `YYYY-MM-DD`.",
};

export const endDateParam: Param = {
  key: "endDate",
  label: "Check-out date",
  type: "date",
  hint: "Format `YYYY-MM-DD`.",
};

/**
 * `detailedRates` — documented as "If detailed rates are expected", default
 * `false`. Not documented as having any other effect, so the hint says exactly
 * that rather than guessing at a payload shape.
 */
export const detailedRatesParam: Param = {
  key: "detailedRates",
  label: "Detailed rates",
  type: "boolean",
  advanced: true,
  hint: 'Off by default, matching the API. Cloudbeds documents this only as "if detailed rates ' +
    'are expected" and does not publish which extra fields it adds.',
};

/** `includeSharedRooms` — shared dorm rooms in a multi-guest search. */
export const includeSharedRoomsParam: Param = {
  key: "includeSharedRooms",
  label: "Include shared rooms",
  type: "boolean",
  advanced: true,
  hint: "Off by default, matching the API. Turn it on to get shared rooms for multiple " +
    "adults/children.",
};

/**
 * `getReservations`' `status` filter.
 *
 * The six values are the operation's own `enum`; each means the reservation is
 * currently in that state, so this is a single choice rather than the
 * comma-separated multi-value form `getGuestList` accepts.
 */
export const reservationStatusOptions = [
  { value: "not_confirmed", label: "Not confirmed" },
  { value: "confirmed", label: "Confirmed" },
  { value: "canceled", label: "Canceled" },
  { value: "checked_in", label: "Checked in" },
  { value: "checked_out", label: "Checked out" },
  { value: "no_show", label: "No show" },
];

/**
 * `getGuestList`' status filter — seven values, and multi-value.
 *
 * It differs from `getReservations`' list in two ways that matter:
 * `in_progress` is only here, and the vendor documents several values in one
 * comma-separated param ("i.e. in_progress,confirmed"), which is why the action
 * declares this a string rather than a `select`.
 */
export const guestStatusValues = [
  "in_progress",
  "confirmed",
  "not_confirmed",
  "canceled",
  "checked_in",
  "checked_out",
  "no_show",
];
