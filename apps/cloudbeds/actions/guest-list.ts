import type { ActionDefinition } from "@w6w/types";
import { CloudbedsClient, type CloudbedsEnvelope } from "../lib/client.ts";
import { guestStatusValues, paginationParams, propertyIdsParam } from "../lib/params.ts";

/**
 * `GET /getGuestList` — search the guest database.
 *
 * Every parameter is optional. Two of them are not simple filters and are
 * worth reading before use:
 *
 *  - `status` here is the **reservation** status ("Reservation status" in the
 *    vendor's own description) and it takes **several comma-separated values**
 *    in one parameter ("i.e. in_progress,confirmed"). Its vocabulary is also
 *    not `getReservations`': `in_progress` exists only here. So it is a string
 *    with the seven values named, not a single-choice select.
 *  - `sortBy` is an enum of two (`creation` | `modification`), defaulting to
 *    `modification`.
 *
 * `data` is typed `object`, not an array — the guest rows live inside it, and
 * the operation is the only list action in this app whose schema does not
 * describe an array. `count`/`total` are still the envelope's page counters, so
 * the whole body is returned verbatim rather than guessed at.
 */
interface Input {
  propertyIDs?: string;
  resultsFrom?: string;
  resultsTo?: string;
  checkInFrom?: string;
  checkInTo?: string;
  checkOutFrom?: string;
  checkOutTo?: string;
  guestFirstName?: string;
  guestLastName?: string;
  guestEmail?: string;
  guestPhone?: string;
  guestCellPhone?: string;
  status?: string;
  sortBy?: string;
  includeGuestInfo?: boolean;
  excludeSecondaryGuests?: boolean;
  includeGuestRequirements?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

const guestList: ActionDefinition<Input> = {
  key: "guest-list",
  type: "search",
  resource: "guest",
  title: "Search Guests",
  description:
    "Search guests by name, contact details, stay window or reservation status. Every filter is " +
    "optional.",
  params: [
    propertyIdsParam,
    {
      key: "guestFirstName",
      label: "First name",
      type: "string",
    },
    {
      key: "guestLastName",
      label: "Last name",
      type: "string",
    },
    {
      key: "guestEmail",
      label: "Email",
      type: "string",
    },
    {
      key: "guestPhone",
      label: "Phone",
      type: "string",
    },
    {
      key: "guestCellPhone",
      label: "Mobile phone",
      type: "string",
      advanced: true,
    },
    {
      key: "status",
      label: "Reservation status",
      type: "string",
      advanced: true,
      placeholder: "in_progress,confirmed",
      hint: `One or more of ${guestStatusValues.map((v) => `\`${v}\``).join(", ")} — ` +
        "comma-separated, since the API accepts several in one parameter. Note this is the " +
        "reservation's status, and `in_progress` is only in this operation's list.",
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      advanced: true,
      options: [
        { value: "modification", label: "Last modified (API default)" },
        { value: "creation", label: "Created" },
      ],
    },
    {
      key: "resultsFrom",
      label: "Created or modified from",
      type: "datetime",
      advanced: true,
      hint: "Lower limit on the guest's latest creation/modification date.",
    },
    {
      key: "resultsTo",
      label: "Created or modified to",
      type: "datetime",
      advanced: true,
      hint: "Upper limit on the guest's latest creation/modification date.",
    },
    {
      key: "checkInFrom",
      label: "Check-in from",
      type: "date",
      advanced: true,
    },
    {
      key: "checkInTo",
      label: "Check-in to",
      type: "date",
      advanced: true,
    },
    {
      key: "checkOutFrom",
      label: "Check-out from",
      type: "date",
      advanced: true,
    },
    {
      key: "checkOutTo",
      label: "Check-out to",
      type: "date",
      advanced: true,
    },
    {
      key: "includeGuestInfo",
      label: "Include guest info",
      type: "boolean",
      advanced: true,
      hint: "Off by default. Turns on the fuller guest record in the response.",
    },
    {
      key: "excludeSecondaryGuests",
      label: "Primary guests only",
      type: "boolean",
      advanced: true,
      hint: "Off by default. Turn it on to drop secondary guests from the result.",
    },
    {
      key: "includeGuestRequirements",
      label: "Include guest requirements",
      type: "boolean",
      advanced: true,
    },
    ...paginationParams(100, "Results per page. Defaults to 100, which is also the maximum."),
  ],
  output: [
    { key: "data", type: "object", label: "Guest rows" },
    { key: "count", type: "number", label: "Guests in this page" },
    { key: "total", type: "number", label: "Total matching guests" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    return new CloudbedsClient(ctx).request<CloudbedsEnvelope<Record<string, unknown>>>(
      "/getGuestList",
      {
        query: {
          propertyIDs: input.propertyIDs,
          resultsFrom: input.resultsFrom,
          resultsTo: input.resultsTo,
          checkInFrom: input.checkInFrom,
          checkInTo: input.checkInTo,
          checkOutFrom: input.checkOutFrom,
          checkOutTo: input.checkOutTo,
          guestFirstName: input.guestFirstName,
          guestLastName: input.guestLastName,
          guestEmail: input.guestEmail,
          guestPhone: input.guestPhone,
          guestCellPhone: input.guestCellPhone,
          status: input.status,
          sortBy: input.sortBy,
          includeGuestInfo: input.includeGuestInfo,
          excludeSecondaryGuests: input.excludeSecondaryGuests,
          includeGuestRequirements: input.includeGuestRequirements,
          pageNumber: input.pageNumber,
          pageSize: input.pageSize,
        },
      },
    );
  },
};

export default guestList;
