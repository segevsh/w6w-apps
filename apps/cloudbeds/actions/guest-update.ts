import type { ActionDefinition } from "@w6w/types";
import {
  asRecordList,
  CloudbedsClient,
  type CloudbedsEnvelope,
  type FormValue,
} from "../lib/client.ts";

/**
 * `PUT /putGuest` — update a guest's contact, document and company details.
 *
 * The vendor's own operation description carries the constraint this action
 * documents rather than enforces: "At least one information field is required
 * for this call." Together with `guestID`, that is the whole usability rule —
 * nothing in the schema is `required`, so declaring `guestID` required is the
 * one deliberate deviation, and it is the same judgement as
 * `reservation-update`: without it the request names no guest.
 *
 * Two field groups are arrays of objects, and the vendor's descriptions are
 * worth keeping in the hints: `guestCustomFields` must reference a registered
 * custom-field shortcode and must never carry payment data, and
 * `guestRequirements` is documented as an array of objects with **no** element
 * properties published, so it is a `json` param.
 *
 * `idempotent: false`: the operation takes no idempotency key, and a
 * pass-through of a partial form is not safe to replay blind.
 */
interface Input {
  guestID: string;
  propertyID?: string;
  guestFirstName?: string;
  guestLastName?: string;
  guestGender?: string;
  guestEmail?: string;
  guestPhone?: string;
  guestCellPhone?: string;
  guestAddress1?: string;
  guestAddress2?: string;
  guestCity?: string;
  guestCountry?: string;
  guestNationality?: string;
  guestState?: string;
  guestZip?: string;
  guestBirthDate?: string;
  guestDocumentType?: string;
  guestDocumentNumber?: string;
  guestDocumentIssueDate?: string;
  guestDocumentIssuingCountry?: string;
  guestDocumentExpirationDate?: string;
  guestRequirements?: unknown;
  guestCustomFields?: Array<Record<string, unknown>>;
  guestCompanyName?: string;
  guestCompanyTaxId?: string;
  guestTaxId?: string;
}

const guestUpdate: ActionDefinition<Input> = {
  key: "guest-update",
  type: "perform",
  resource: "guest",
  title: "Update Guest",
  description:
    "Update a guest's contact, address, document or company details. At least one field must be " +
    "supplied.",
  idempotent: false,
  params: [
    {
      key: "guestID",
      label: "Guest ID",
      type: "string",
      required: true,
      hint: "Not marked required by the schema, but without it the request names no guest.",
    },
    {
      key: "propertyID",
      label: "Property",
      type: "string",
      hint: "Needed for a multi-property credential.",
    },
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
      key: "guestGender",
      label: "Gender",
      type: "string",
      advanced: true,
    },
    {
      key: "guestAddress1",
      label: "Address line 1",
      type: "string",
      advanced: true,
    },
    {
      key: "guestAddress2",
      label: "Address line 2",
      type: "string",
      advanced: true,
    },
    {
      key: "guestCity",
      label: "City",
      type: "string",
      advanced: true,
    },
    {
      key: "guestState",
      label: "State / region",
      type: "string",
      advanced: true,
    },
    {
      key: "guestZip",
      label: "Postal code",
      type: "string",
      advanced: true,
    },
    {
      key: "guestCountry",
      label: "Country",
      type: "string",
      advanced: true,
    },
    {
      key: "guestNationality",
      label: "Nationality",
      type: "string",
      advanced: true,
    },
    {
      key: "guestBirthDate",
      label: "Date of birth",
      type: "string",
      advanced: true,
      hint: "The vendor accepts a string here and documents no format, so none is imposed.",
    },
    {
      key: "guestDocumentType",
      label: "Document type",
      type: "string",
      advanced: true,
    },
    {
      key: "guestDocumentNumber",
      label: "Document number",
      type: "string",
      advanced: true,
    },
    {
      key: "guestDocumentIssueDate",
      label: "Document issue date",
      type: "string",
      advanced: true,
    },
    {
      key: "guestDocumentIssuingCountry",
      label: "Document issuing country",
      type: "string",
      advanced: true,
    },
    {
      key: "guestDocumentExpirationDate",
      label: "Document expiration date",
      type: "string",
      advanced: true,
    },
    {
      key: "guestCustomFields",
      label: "Custom fields",
      type: "array",
      advanced: true,
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
      key: "guestRequirements",
      label: "Guest requirements",
      type: "json",
      advanced: true,
      hint: "JSON array of objects. Cloudbeds documents this field as an array of objects but " +
        "publishes no element properties, so it is passed through as given.",
    },
    {
      key: "guestCompanyName",
      label: "Company name",
      type: "string",
      advanced: true,
    },
    {
      key: "guestCompanyTaxId",
      label: "Company tax ID",
      type: "string",
      advanced: true,
    },
    {
      key: "guestTaxId",
      label: "Guest tax ID",
      type: "string",
      advanced: true,
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    const body: Record<string, FormValue> = {
      guestID: input.guestID,
      propertyID: input.propertyID,
      guestFirstName: input.guestFirstName,
      guestLastName: input.guestLastName,
      guestGender: input.guestGender,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone,
      guestCellPhone: input.guestCellPhone,
      guestAddress1: input.guestAddress1,
      guestAddress2: input.guestAddress2,
      guestCity: input.guestCity,
      guestCountry: input.guestCountry,
      guestNationality: input.guestNationality,
      guestState: input.guestState,
      guestZip: input.guestZip,
      guestBirthDate: input.guestBirthDate,
      guestDocumentType: input.guestDocumentType,
      guestDocumentNumber: input.guestDocumentNumber,
      guestDocumentIssueDate: input.guestDocumentIssueDate,
      guestDocumentIssuingCountry: input.guestDocumentIssuingCountry,
      guestDocumentExpirationDate: input.guestDocumentExpirationDate,
      guestRequirements: asRecordList(input.guestRequirements, "guestRequirements"),
      guestCustomFields: input.guestCustomFields,
      guestCompanyName: input.guestCompanyName,
      guestCompanyTaxId: input.guestCompanyTaxId,
      guestTaxId: input.guestTaxId,
    };
    return new CloudbedsClient(ctx).request<CloudbedsEnvelope>("/putGuest", {
      method: "PUT",
      body,
    });
  },
};

export default guestUpdate;
