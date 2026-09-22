import type { ActionDefinition } from "@w6w/types";
import { CloudbedsClient, type CloudbedsEnvelope, type FormValue } from "../lib/client.ts";

/**
 * `PUT /putReservation` — change a reservation's status, rooms, arrival time or
 * custom fields.
 *
 * `reservationID` is not in the vendor's `required` list (nothing is), but the
 * operation cannot be aimed without it: it is the only field that says *which*
 * reservation to update. `propertyID` is not strictly needed either — a
 * single-property credential resolves it — but a multi-property one needs it,
 * so both are declared required here and the reason is stated rather than
 * implied.
 *
 * The vendor's three `rooms[].` requirements for a room modification are all
 * spelled out in the field hints: `roomTypeID`, `checkinDate` and `checkoutDate`
 * are "mandatory if rooms are sent", and `adults`/`children` are too. A partial
 * `rooms` row is refused rather than partially applied.
 *
 * `adjustPrice` is the subtle one, and the vendor's own description is the only
 * honest summary: it defaults to `true`, and when set to `false` the existing
 * price is preserved for *any* modification of the room — a guest-count change
 * included, so extra occupants are not charged. A modification with no price to
 * preserve (extending the stay, or moving it onto dates the reservation did not
 * cover) is rejected outright.
 *
 * `idempotent: false`: re-running a status change is usually harmless, but
 * re-running a room change re-prices the reservation, and the operation takes
 * no idempotency key.
 */
interface Input {
  reservationID: string;
  propertyID: string;
  status?: string;
  estimatedArrivalTime?: string;
  checkoutDate?: string;
  rooms?: Array<Record<string, unknown>>;
  customFields?: Array<Record<string, unknown>>;
  dateCreated?: string;
  allotmentBlockCode?: string;
  eventCode?: string;
  sendStatusChangeEmail?: boolean;
  canceledByGuest?: boolean;
}

const reservationUpdate: ActionDefinition<Input> = {
  key: "reservation-update",
  type: "perform",
  resource: "reservation",
  title: "Update Reservation",
  description: "Update a reservation's status, arrival time, rooms or custom fields.",
  idempotent: false,
  params: [
    {
      key: "reservationID",
      label: "Reservation ID",
      type: "string",
      required: true,
      hint: "Not marked required by the schema, but without it the request does not name a " +
        "reservation.",
    },
    {
      key: "propertyID",
      label: "Property",
      type: "string",
      required: true,
      hint: "Needed for a multi-property credential; a single-property one can read it from the " +
        "token, but it is sent explicitly so the call is unambiguous.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "confirmed", label: "Confirmed" },
        { value: "not_confirmed", label: "Not confirmed" },
        { value: "checked_in", label: "Checked in" },
        { value: "checked_out", label: "Checked out" },
        { value: "canceled", label: "Canceled" },
        { value: "no_show", label: "No show" },
      ],
      hint: "The reservation's new state. Left empty, the status is untouched.",
    },
    {
      key: "checkoutDate",
      label: "Check-out date",
      type: "date",
      hint: "Changes the reservation-level check-out date. Room-level dates are set through " +
        "`rooms`.",
    },
    {
      key: "estimatedArrivalTime",
      label: "Estimated arrival time",
      type: "string",
    },
    {
      key: "rooms",
      label: "Rooms",
      type: "array",
      item: {
        type: "object",
        fields: [
          {
            key: "roomTypeID",
            label: "Room type ID",
            type: "string",
            hint: "Mandatory if rooms are sent.",
          },
          {
            key: "checkinDate",
            label: "Check-in date",
            type: "date",
            hint: "Mandatory if rooms are sent.",
          },
          {
            key: "checkoutDate",
            label: "Check-out date",
            type: "date",
            hint: "Mandatory if rooms are sent.",
          },
          {
            key: "adults",
            label: "Adults",
            type: "number",
            validation: { integer: true, min: 0 },
            hint: "Mandatory if rooms are sent.",
          },
          {
            key: "children",
            label: "Children",
            type: "number",
            validation: { integer: true, min: 0 },
            hint: "Mandatory if rooms are sent.",
          },
          {
            key: "subReservationID",
            label: "Sub-reservation ID",
            type: "string",
            hint: "Optional: names the specific assigned room to change.",
          },
          {
            key: "rateID",
            label: "Rate ID",
            type: "string",
          },
          {
            key: "adjustPrice",
            label: "Re-price",
            type: "boolean",
            hint: "On by default, matching the API. Turn it off to keep the existing price for " +
              "any modification of the room — including an extra guest, who is then not charged. " +
              "A modification with no price to preserve (extending the stay, or moving it onto " +
              "dates the reservation did not cover) is rejected.",
          },
        ],
      },
      hint: "Room-level changes. Each row needs a room type, both dates and both occupancies.",
    },
    {
      key: "customFields",
      label: "Custom fields",
      type: "array",
      item: {
        type: "object",
        fields: [
          {
            key: "customFieldName",
            label: "Field name",
            type: "string",
            hint: "Must match the registered shortcode in the Cloudbeds back office.",
          },
          {
            key: "customFieldValue",
            label: "Field value",
            type: "string",
            hint: "Never send payment data here — the vendor forbids it and rejects Luhn-valid " +
              "numbers longer than 12 characters.",
          },
        ],
      },
    },
    {
      key: "dateCreated",
      label: "Created at",
      type: "string",
      advanced: true,
      hint: "The vendor accepts a string here and documents no format, so none is imposed.",
    },
    {
      key: "allotmentBlockCode",
      label: "Allotment block code",
      type: "string",
      advanced: true,
    },
    {
      key: "eventCode",
      label: "Event code",
      type: "string",
      advanced: true,
    },
    {
      key: "sendStatusChangeEmail",
      label: "Send status-change e-mail",
      type: "boolean",
      advanced: true,
      hint: "Off by default, matching the API.",
    },
    {
      key: "canceledByGuest",
      label: "Canceled by guest",
      type: "boolean",
      advanced: true,
      hint: "Marks a cancellation as guest-initiated rather than property-initiated.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "message", type: "string", label: "Message" },
    { key: "data", type: "object", label: "Result data" },
  ],

  execute(input, ctx) {
    const body: Record<string, FormValue> = {
      reservationID: input.reservationID,
      propertyID: input.propertyID,
      status: input.status,
      estimatedArrivalTime: input.estimatedArrivalTime,
      checkoutDate: input.checkoutDate,
      rooms: input.rooms,
      customFields: input.customFields,
      dateCreated: input.dateCreated,
      allotmentBlockCode: input.allotmentBlockCode,
      eventCode: input.eventCode,
      sendStatusChangeEmail: input.sendStatusChangeEmail,
      canceledByGuest: input.canceledByGuest,
    };
    return new CloudbedsClient(ctx).request<CloudbedsEnvelope>("/putReservation", {
      method: "PUT",
      body,
    });
  },
};

export default reservationUpdate;
