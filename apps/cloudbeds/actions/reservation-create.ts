import type { ActionDefinition } from "@w6w/types";
import {
  asRecordList,
  CloudbedsClient,
  type CloudbedsEnvelope,
  type FormValue,
} from "../lib/client.ts";

/**
 * `POST /postReservation` — create a reservation.
 *
 * **No field is `required` in the vendor's schema**, and that is not an
 * oversight: the operation is documented as a bag of optional fields, so
 * `required: []` is the vendor's own answer and this action does not invent a
 * stricter one. What it does instead is say, in the parameter hints, what a
 * *usable* reservation actually needs — Cloudbeds documents a reservation as
 * having a property, a stay and a guest, so a call without `propertyID`,
 * `startDate`, `endDate`, `guestFirstName`, `guestLastName`, `rooms` and
 * `adults` will be refused or produce an unusable record.
 *
 * The three list fields are arrays of objects, and the vendor publishes the
 * shape of two of them:
 *
 *  - `rooms` — `roomTypeID` + `quantity`, with the optional `roomID` (which
 *    overrides the quantity and the room type with a specific room) and
 *    `roomRateID`.
 *  - `adults` / `children` — the same `roomTypeID`/`quantity`/`roomID` triple,
 *    one entry per room type.
 *  - `customFields` — `fieldName` (the registered shortcode) + `fieldValue`.
 *  - `guestRequirements` — documented only as `array of object`, with no
 *    element properties at all, so it is a `json` param rather than a form.
 *
 * `idempotent: false`: Cloudbeds accepts no idempotency key, so a retry after a
 * dropped connection would book the room twice. A workflow that must not
 * double-book has to reconcile with `reservation-list` (by
 * `sourceReservationId`) before retrying.
 *
 * `customFields.fieldValue` must not carry payment data: the vendor rejects
 * Luhn-valid numeric values longer than 12 characters, and says sending
 * unencrypted payment data is forbidden.
 */
interface Input {
  propertyID?: string;
  startDate?: string;
  endDate?: string;
  guestFirstName?: string;
  guestLastName?: string;
  guestGender?: string;
  guestCountry?: string;
  guestNationality?: string;
  guestZip?: string;
  guestEmail?: string;
  guestPhone?: string;
  estimatedArrivalTime?: string;
  sourceID?: string;
  thirdPartyIdentifier?: string;
  rooms?: Array<Record<string, unknown>>;
  adults?: Array<Record<string, unknown>>;
  children?: Array<Record<string, unknown>>;
  customFields?: Array<Record<string, unknown>>;
  guestRequirements?: unknown;
  paymentMethod?: string;
  cardToken?: string;
  paymentAuthorizationCode?: string;
  promoCode?: string;
  allotmentBlockCode?: string;
  groupCode?: string;
  dateCreated?: string;
  sendEmailConfirmation?: boolean;
}

/** The `roomTypeID`/`quantity`/`roomID` triple shared by rooms and occupancies. */
function roomFields(quantityLabel: string) {
  return [
    {
      key: "roomTypeID",
      label: "Room type ID",
      type: "string" as const,
      hint: "The room type this row is about — see `room-type-list`.",
    },
    {
      key: "quantity",
      label: quantityLabel,
      type: "number" as const,
      validation: { integer: true, min: 1 },
    },
    {
      key: "roomID",
      label: "Room ID",
      type: "string" as const,
      hint: "Optional. Names one physical room instead of a quantity — it overrides `quantity` " +
        "and `roomTypeID`, and requires the individual-room feature to be enabled.",
    },
  ];
}

const reservationCreate: ActionDefinition<Input> = {
  key: "reservation-create",
  type: "perform",
  resource: "reservation",
  title: "Create Reservation",
  description: "Create a reservation for a property, with rooms, occupancy and guest details.",
  idempotent: false,
  params: [
    {
      key: "propertyID",
      label: "Property",
      type: "string",
      hint: "Needed for a usable reservation, though the schema marks nothing required.",
    },
    {
      key: "startDate",
      label: "Check-in date",
      type: "date",
      hint: "Needed for a usable reservation. `YYYY-MM-DD`.",
    },
    {
      key: "endDate",
      label: "Check-out date",
      type: "date",
      hint: "Needed for a usable reservation. `YYYY-MM-DD`.",
    },
    {
      key: "guestFirstName",
      label: "Guest first name",
      type: "string",
      hint: "Needed for a usable reservation.",
    },
    {
      key: "guestLastName",
      label: "Guest last name",
      type: "string",
      hint: "Needed for a usable reservation.",
    },
    {
      key: "rooms",
      label: "Rooms",
      type: "array",
      item: {
        type: "object",
        fields: [
          ...roomFields("Quantity of rooms"),
          {
            key: "roomRateID",
            label: "Room rate ID",
            type: "string",
            hint: "Optional specific rate for this room type.",
          },
        ],
      },
      hint: "One row per room type booked. Needed for a usable reservation.",
    },
    {
      key: "adults",
      label: "Adults",
      type: "array",
      item: { type: "object", fields: roomFields("Quantity of adults") },
      hint: "One row per room type, with the number of adults in it. Needed for a usable " +
        "reservation.",
    },
    {
      key: "children",
      label: "Children",
      type: "array",
      item: { type: "object", fields: roomFields("Quantity of children") },
      hint: "One row per room type with children in it. Omit entirely when there are none.",
    },
    {
      key: "guestEmail",
      label: "Guest email",
      type: "string",
    },
    {
      key: "guestPhone",
      label: "Guest phone",
      type: "string",
    },
    {
      key: "guestGender",
      label: "Guest gender",
      type: "string",
      advanced: true,
    },
    {
      key: "guestCountry",
      label: "Guest country",
      type: "string",
      advanced: true,
    },
    {
      key: "guestNationality",
      label: "Guest nationality",
      type: "string",
      advanced: true,
    },
    {
      key: "guestZip",
      label: "Guest postal code",
      type: "string",
      advanced: true,
    },
    {
      key: "estimatedArrivalTime",
      label: "Estimated arrival time",
      type: "string",
      advanced: true,
    },
    {
      key: "customFields",
      label: "Custom fields",
      type: "array",
      item: {
        type: "object",
        fields: [
          {
            key: "fieldName",
            label: "Field name",
            type: "string",
            hint: "Must match the registered shortcode in the Cloudbeds back office.",
          },
          {
            key: "fieldValue",
            label: "Field value",
            type: "string",
            hint: "Never send payment data here — the vendor forbids it and rejects Luhn-valid " +
              "numbers longer than 12 characters.",
          },
        ],
      },
    },
    {
      key: "guestRequirements",
      label: "Guest requirements",
      type: "json",
      hint: "JSON array of objects. Cloudbeds documents this field as an array of objects but " +
        "publishes no element properties, so it is passed through as given.",
    },
    {
      key: "sourceID",
      label: "Source ID",
      type: "string",
      advanced: true,
      hint: "The booking source this reservation should be attributed to.",
    },
    {
      key: "thirdPartyIdentifier",
      label: "Third-party identifier",
      type: "string",
      advanced: true,
    },
    {
      key: "promoCode",
      label: "Promo code",
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
      key: "dateCreated",
      label: "Created at",
      type: "string",
      advanced: true,
      hint: "Backdate the reservation's creation timestamp. The vendor accepts a string here and " +
        "does not document a format, so it is not constrained to one.",
    },
    {
      key: "paymentMethod",
      label: "Payment method",
      type: "string",
      advanced: true,
    },
    {
      key: "cardToken",
      label: "Card token",
      type: "string",
      advanced: true,
      hint: "A token minted by Cloudbeds' own card-tokenisation flow — never a card number.",
    },
    {
      key: "paymentAuthorizationCode",
      label: "Payment authorization code",
      type: "string",
      advanced: true,
    },
    {
      key: "sendEmailConfirmation",
      label: "Send e-mail confirmation",
      type: "boolean",
      advanced: true,
      hint: "Off by default, matching the API.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "reservationID", type: "string", label: "Created reservation ID" },
    { key: "guestID", type: "string", label: "Created guest ID" },
    { key: "status", type: "string", label: "Reservation status" },
    { key: "guestFirstName", type: "string", label: "Guest first name" },
    { key: "guestLastName", type: "string", label: "Guest last name" },
    { key: "guestGender", type: "string", label: "Guest gender" },
    { key: "guestEmail", type: "string", label: "Guest email" },
    { key: "startDate", type: "string", label: "Check-in date" },
    { key: "endDate", type: "string", label: "Check-out date" },
    { key: "dateCreated", type: "string", label: "Created at" },
    { key: "grandTotal", type: "number", label: "Grand total" },
    { key: "unassigned", type: "array", label: "Unassigned room requests" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    const body: Record<string, FormValue> = {
      propertyID: input.propertyID,
      startDate: input.startDate,
      endDate: input.endDate,
      guestFirstName: input.guestFirstName,
      guestLastName: input.guestLastName,
      guestGender: input.guestGender,
      guestCountry: input.guestCountry,
      guestNationality: input.guestNationality,
      guestZip: input.guestZip,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone,
      estimatedArrivalTime: input.estimatedArrivalTime,
      sourceID: input.sourceID,
      thirdPartyIdentifier: input.thirdPartyIdentifier,
      rooms: input.rooms,
      adults: input.adults,
      children: input.children,
      customFields: input.customFields,
      guestRequirements: asRecordList(input.guestRequirements, "guestRequirements"),
      paymentMethod: input.paymentMethod,
      cardToken: input.cardToken,
      paymentAuthorizationCode: input.paymentAuthorizationCode,
      promoCode: input.promoCode,
      allotmentBlockCode: input.allotmentBlockCode,
      groupCode: input.groupCode,
      dateCreated: input.dateCreated,
      sendEmailConfirmation: input.sendEmailConfirmation,
    };
    return new CloudbedsClient(ctx).request<CloudbedsEnvelope>("/postReservation", {
      method: "POST",
      body,
    });
  },
};

export default reservationCreate;
