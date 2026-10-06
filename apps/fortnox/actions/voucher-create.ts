import type { ActionDefinition } from "@w6w/types";
import { compact, FortnoxClient, jsonArray, jsonObject } from "../lib/client.ts";

interface Input {
  voucherSeries: string;
  transactionDate: string;
  description: string;
  year: number;
  voucherRows: unknown;
  comments?: string;
  referenceNumber?: string;
  referenceType?: string;
  additionalFields?: unknown;
  financialYear?: string;
}

const voucherCreate: ActionDefinition<Input> = {
  key: "voucher-create",
  type: "perform",
  resource: "voucher",
  title: "Create Voucher",
  description: "Create a manual voucher.",
  idempotent: false,
  params: [
    {
      "key": "voucherSeries",
      "label": "Voucher series",
      "type": "string",
      "required": true,
    },
    {
      "key": "transactionDate",
      "label": "Transaction date",
      "type": "string",
      "required": true,
      "hint": "YYYY-MM-DD.",
    },
    {
      "key": "description",
      "label": "Description",
      "type": "string",
      "required": true,
    },
    {
      "key": "year",
      "label": "Financial year (e.g. 2026)",
      "type": "number",
      "required": true,
      "hint": "Marked required in the reference.",
    },
    {
      "key": "voucherRows",
      "label": "Voucher rows",
      "type": "json",
      "required": true,
      "hint":
        'Array of rows, e.g. [{"Account":1930,"Debit":100},{"Account":3001,"Credit":100}]. Debit and credit must balance.',
    },
    {
      "key": "comments",
      "label": "Comments",
      "type": "string",
    },
    {
      "key": "referenceNumber",
      "label": "Reference number",
      "type": "string",
    },
    {
      "key": "referenceType",
      "label": "Reference type",
      "type": "select",
      "options": [
        {
          "value": "INVOICE",
          "label": "INVOICE",
        },
        {
          "value": "SUPPLIERINVOICE",
          "label": "SUPPLIERINVOICE",
        },
        {
          "value": "INVOICEPAYMENT",
          "label": "INVOICEPAYMENT",
        },
        {
          "value": "SUPPLIERPAYMENT",
          "label": "SUPPLIERPAYMENT",
        },
        {
          "value": "MANUAL",
          "label": "MANUAL",
        },
        {
          "value": "CASHINVOICE",
          "label": "CASHINVOICE",
        },
        {
          "value": "ACCRUAL",
          "label": "ACCRUAL",
        },
      ],
    },
    {
      "key": "additionalFields",
      "label": "Additional fields",
      "type": "json",
      "hint":
        'Any other Fortnox field of this record, by its API name, merged into the payload last (e.g. {"Comments": "..."}). Send an empty string to clear a value.',
    },
    {
      "key": "financialYear",
      "label": "Financial year id",
      "type": "string",
      "hint": "Defaults to the preselected financial year.",
    },
  ],
  output: [
    {
      "key": "Voucher",
      "type": "object",
      "label": "Create Voucher result",
    },
  ],

  execute(input, ctx) {
    const payload = {
      VoucherSeries: input.voucherSeries,
      TransactionDate: input.transactionDate,
      Description: input.description,
      Year: input.year,
      VoucherRows: jsonArray(input.voucherRows, "voucherRows"),
      Comments: input.comments,
      ReferenceNumber: input.referenceNumber,
      ReferenceType: input.referenceType,
    };
    return new FortnoxClient(ctx).post(
      "/3/vouchers",
      {
        Voucher: { ...compact(payload), ...jsonObject(input.additionalFields, "additionalFields") },
      },
      { financialyear: input.financialYear },
    );
  },
};

export default voucherCreate;
