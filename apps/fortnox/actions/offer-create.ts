import type { ActionDefinition } from "@w6w/types";
import { compact, FortnoxClient, jsonArray, jsonObject } from "../lib/client.ts";

interface Input {
  customerNumber: string;
  offerDate?: string;
  expireDate?: string;
  currency?: string;
  yourReference?: string;
  ourReference?: string;
  termsOfPayment?: string;
  termsOfDelivery?: string;
  wayOfDelivery?: string;
  project?: string;
  costCenter?: string;
  remarks?: string;
  comments?: string;
  vatIncluded?: boolean;
  notCompleted?: boolean;
  offerRows?: unknown;
  additionalFields?: unknown;
}

const offerCreate: ActionDefinition<Input> = {
  key: "offer-create",
  type: "perform",
  resource: "offer",
  title: "Create Offer",
  description: "Create an offer (quote).",
  idempotent: false,
  params: [
    {
      "key": "customerNumber",
      "label": "Customer number",
      "type": "string",
      "required": true,
    },
    {
      "key": "offerDate",
      "label": "Offer date",
      "type": "string",
      "hint": "YYYY-MM-DD.",
    },
    {
      "key": "expireDate",
      "label": "Expiry date",
      "type": "string",
    },
    {
      "key": "currency",
      "label": "Currency",
      "type": "string",
    },
    {
      "key": "yourReference",
      "label": "Your reference",
      "type": "string",
    },
    {
      "key": "ourReference",
      "label": "Our reference",
      "type": "string",
    },
    {
      "key": "termsOfPayment",
      "label": "Terms of payment code",
      "type": "string",
    },
    {
      "key": "termsOfDelivery",
      "label": "Terms of delivery code",
      "type": "string",
    },
    {
      "key": "wayOfDelivery",
      "label": "Way of delivery code",
      "type": "string",
    },
    {
      "key": "project",
      "label": "Project number",
      "type": "string",
    },
    {
      "key": "costCenter",
      "label": "Cost center code",
      "type": "string",
    },
    {
      "key": "remarks",
      "label": "Remarks",
      "type": "string",
    },
    {
      "key": "comments",
      "label": "Comments",
      "type": "string",
    },
    {
      "key": "vatIncluded",
      "label": "Prices include VAT",
      "type": "boolean",
    },
    {
      "key": "notCompleted",
      "label": "Save as not completed",
      "type": "boolean",
    },
    {
      "key": "offerRows",
      "label": "Offer rows",
      "type": "json",
      "hint":
        'Array of row objects using the Fortnox field names, e.g. [{"ArticleNumber":"A1","DeliveredQuantity":"2","Price":100}]. When updating, unspecified rows are dropped unless every row carries its RowId.',
    },
    {
      "key": "additionalFields",
      "label": "Additional fields",
      "type": "json",
      "hint":
        'Any other Fortnox field of this record, by its API name, merged into the payload last (e.g. {"Comments": "..."}). Send an empty string to clear a value.',
    },
  ],
  output: [
    {
      "key": "Offer",
      "type": "object",
      "label": "Create Offer result",
    },
  ],

  execute(input, ctx) {
    const payload = {
      CustomerNumber: input.customerNumber,
      OfferDate: input.offerDate,
      ExpireDate: input.expireDate,
      Currency: input.currency,
      YourReference: input.yourReference,
      OurReference: input.ourReference,
      TermsOfPayment: input.termsOfPayment,
      TermsOfDelivery: input.termsOfDelivery,
      WayOfDelivery: input.wayOfDelivery,
      Project: input.project,
      CostCenter: input.costCenter,
      Remarks: input.remarks,
      Comments: input.comments,
      VATIncluded: input.vatIncluded,
      NotCompleted: input.notCompleted,
      OfferRows: jsonArray(input.offerRows, "offerRows"),
    };
    return new FortnoxClient(ctx).post(
      "/3/offers",
      { Offer: { ...compact(payload), ...jsonObject(input.additionalFields, "additionalFields") } },
    );
  },
};

export default offerCreate;
