import type { ActionDefinition } from "@w6w/types";
import { compact, FortnoxClient, jsonObject, seg } from "../lib/client.ts";

interface Input {
  articleNumber: string;
  description?: string;
  type?: string;
  salesPrice?: number;
  purchasePrice?: number;
  unit?: string;
  vat?: number;
  salesAccount?: number;
  purchaseAccount?: number;
  ean?: string;
  manufacturer?: string;
  supplierNumber?: string;
  active?: boolean;
  note?: string;
  additionalFields?: unknown;
}

const articleUpdate: ActionDefinition<Input> = {
  key: "article-update",
  type: "perform",
  resource: "article",
  title: "Update Article",
  description: "Update an article. Only the properties sent are changed.",
  idempotent: true,
  params: [
    {
      "key": "articleNumber",
      "label": "Article number",
      "type": "string",
      "required": true,
    },
    {
      "key": "description",
      "label": "Description",
      "type": "string",
    },
    {
      "key": "type",
      "label": "Type",
      "type": "select",
      "options": [
        {
          "value": "STOCK",
          "label": "STOCK",
        },
        {
          "value": "SERVICE",
          "label": "SERVICE",
        },
      ],
    },
    {
      "key": "salesPrice",
      "label": "Sales price",
      "type": "number",
    },
    {
      "key": "purchasePrice",
      "label": "Purchase price",
      "type": "number",
    },
    {
      "key": "unit",
      "label": "Unit code",
      "type": "string",
    },
    {
      "key": "vat",
      "label": "VAT percent",
      "type": "number",
    },
    {
      "key": "salesAccount",
      "label": "Sales account",
      "type": "number",
    },
    {
      "key": "purchaseAccount",
      "label": "Purchase account",
      "type": "number",
    },
    {
      "key": "ean",
      "label": "EAN",
      "type": "string",
    },
    {
      "key": "manufacturer",
      "label": "Manufacturer",
      "type": "string",
    },
    {
      "key": "supplierNumber",
      "label": "Supplier number",
      "type": "string",
    },
    {
      "key": "active",
      "label": "Active",
      "type": "boolean",
    },
    {
      "key": "note",
      "label": "Note",
      "type": "string",
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
      "key": "Article",
      "type": "object",
      "label": "Update Article result",
    },
  ],

  execute(input, ctx) {
    const payload = {
      Description: input.description,
      Type: input.type,
      SalesPrice: input.salesPrice,
      PurchasePrice: input.purchasePrice,
      Unit: input.unit,
      VAT: input.vat,
      SalesAccount: input.salesAccount,
      PurchaseAccount: input.purchaseAccount,
      EAN: input.ean,
      Manufacturer: input.manufacturer,
      SupplierNumber: input.supplierNumber,
      Active: input.active,
      Note: input.note,
    };
    return new FortnoxClient(ctx).put(
      `/3/articles/${seg(input.articleNumber)}`,
      {
        Article: { ...compact(payload), ...jsonObject(input.additionalFields, "additionalFields") },
      },
    );
  },
};

export default articleUpdate;
