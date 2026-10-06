import type { ActionDefinition } from "@w6w/types";
import { compact, FortnoxClient, jsonArray, jsonObject, seg } from "../lib/client.ts";

interface Input {
  documentNumber: string;
  invoiceDate?: string;
  dueDate?: string;
  language?: string;
  invoiceType?: string;
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
  invoiceRows?: unknown;
  additionalFields?: unknown;
}

const invoiceUpdate: ActionDefinition<Input> = {
  key: "invoice-update",
  type: "perform",
  resource: "invoice",
  title: "Update Invoice",
  description:
    "Update an unbooked invoice. Only the properties sent are changed; see the rows note.",
  idempotent: true,
  params: [
    {
      "key": "documentNumber",
      "label": "Invoice document number",
      "type": "string",
      "required": true,
    },
    {
      "key": "invoiceDate",
      "label": "Invoice date",
      "type": "string",
      "hint": "YYYY-MM-DD.",
    },
    {
      "key": "dueDate",
      "label": "Due date",
      "type": "string",
      "hint": "YYYY-MM-DD.",
    },
    {
      "key": "language",
      "label": "Language",
      "type": "select",
      "options": [
        {
          "value": "SV",
          "label": "SV",
        },
        {
          "value": "EN",
          "label": "EN",
        },
      ],
    },
    {
      "key": "invoiceType",
      "label": "Invoice type",
      "type": "select",
      "options": [
        {
          "value": "INVOICE",
          "label": "INVOICE",
        },
        {
          "value": "AGREEMENTINVOICE",
          "label": "AGREEMENTINVOICE",
        },
        {
          "value": "INTRESTINVOICE",
          "label": "INTRESTINVOICE",
        },
        {
          "value": "SUMMARYINVOICE",
          "label": "SUMMARYINVOICE",
        },
        {
          "value": "CASHINVOICE",
          "label": "CASHINVOICE",
        },
      ],
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
      "key": "invoiceRows",
      "label": "Invoice rows",
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
      "key": "Invoice",
      "type": "object",
      "label": "Update Invoice result",
    },
  ],

  execute(input, ctx) {
    const payload = {
      InvoiceDate: input.invoiceDate,
      DueDate: input.dueDate,
      Language: input.language,
      InvoiceType: input.invoiceType,
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
      InvoiceRows: jsonArray(input.invoiceRows, "invoiceRows"),
    };
    return new FortnoxClient(ctx).put(
      `/3/invoices/${seg(input.documentNumber)}`,
      {
        Invoice: { ...compact(payload), ...jsonObject(input.additionalFields, "additionalFields") },
      },
    );
  },
};

export default invoiceUpdate;
