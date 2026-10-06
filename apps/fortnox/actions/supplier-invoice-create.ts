import type { ActionDefinition } from "@w6w/types";
import { compact, FortnoxClient, jsonArray, jsonObject } from "../lib/client.ts";

interface Input {
  supplierNumber: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  total?: number;
  vat?: number;
  currency?: string;
  vatType?: string;
  ocr?: string;
  project?: string;
  costCenter?: string;
  comments?: string;
  supplierInvoiceRows?: unknown;
  additionalFields?: unknown;
}

const supplierInvoiceCreate: ActionDefinition<Input> = {
  key: "supplier-invoice-create",
  type: "perform",
  resource: "supplier-invoice",
  title: "Create Supplier Invoice",
  description: "Register a supplier invoice.",
  idempotent: false,
  params: [
    {
      "key": "supplierNumber",
      "label": "Supplier number",
      "type": "string",
      "required": true,
    },
    {
      "key": "invoiceNumber",
      "label": "Supplier's invoice number",
      "type": "string",
    },
    {
      "key": "invoiceDate",
      "label": "Invoice date",
      "type": "string",
    },
    {
      "key": "dueDate",
      "label": "Due date",
      "type": "string",
    },
    {
      "key": "total",
      "label": "Total",
      "type": "number",
    },
    {
      "key": "vat",
      "label": "VAT amount",
      "type": "number",
    },
    {
      "key": "currency",
      "label": "Currency",
      "type": "string",
    },
    {
      "key": "vatType",
      "label": "VAT type",
      "type": "select",
      "options": [
        {
          "value": "NORMAL",
          "label": "NORMAL",
        },
        {
          "value": "EUINTERNAL",
          "label": "EUINTERNAL",
        },
        {
          "value": "REVERSE",
          "label": "REVERSE",
        },
      ],
    },
    {
      "key": "ocr",
      "label": "OCR",
      "type": "string",
    },
    {
      "key": "project",
      "label": "Project",
      "type": "string",
    },
    {
      "key": "costCenter",
      "label": "Cost center code",
      "type": "string",
    },
    {
      "key": "comments",
      "label": "Comments",
      "type": "string",
    },
    {
      "key": "supplierInvoiceRows",
      "label": "Rows",
      "type": "json",
      "hint":
        'Array of accounting rows, e.g. [{"Account":4010,"Debit":1000},{"Account":2440,"Credit":1250}]. Debit and credit must balance (error 2000755).',
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
      "key": "SupplierInvoice",
      "type": "object",
      "label": "Create Supplier Invoice result",
    },
  ],

  execute(input, ctx) {
    const payload = {
      SupplierNumber: input.supplierNumber,
      InvoiceNumber: input.invoiceNumber,
      InvoiceDate: input.invoiceDate,
      DueDate: input.dueDate,
      Total: input.total,
      VAT: input.vat,
      Currency: input.currency,
      VATType: input.vatType,
      OCR: input.ocr,
      Project: input.project,
      CostCenter: input.costCenter,
      Comments: input.comments,
      SupplierInvoiceRows: jsonArray(input.supplierInvoiceRows, "supplierInvoiceRows"),
    };
    return new FortnoxClient(ctx).post(
      "/3/supplierinvoices",
      {
        SupplierInvoice: {
          ...compact(payload),
          ...jsonObject(input.additionalFields, "additionalFields"),
        },
      },
    );
  },
};

export default supplierInvoiceCreate;
