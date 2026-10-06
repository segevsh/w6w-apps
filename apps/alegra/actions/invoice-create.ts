import type { ActionDefinition } from "@w6w/types";
import { AlegraClient, compact, jsonArray, jsonObject, ref } from "../lib/client.ts";

interface Input {
  date: string;
  dueDate: string;
  clientId: string;
  items: unknown;
  status?: string;
  observations?: string;
  anotation?: string;
  termsConditions?: string;
  numberTemplateId?: string;
  sellerId?: string;
  additionalFields?: unknown;
}

const invoiceCreate: ActionDefinition<Input> = {
  key: "invoice-create",
  type: "perform",
  resource: "invoice",
  title: "Create Sales Invoice",
  description:
    "Create a sales invoice. Without `status` (and without payments) Alegra creates it as a draft.",
  idempotent: false,
  params: [
    {
      key: "date",
      label: "Date",
      type: "string",
      required: true,
      hint: "Invoice date, YYYY-MM-DD.",
    },
    {
      key: "dueDate",
      label: "Due date",
      type: "string",
      required: true,
      hint: "YYYY-MM-DD.",
    },
    {
      key: "clientId",
      label: "Client ID",
      type: "string",
      required: true,
      hint: "The contact id of the client.",
    },
    {
      key: "items",
      label: "Items",
      type: "json",
      required: true,
      hint:
        'JSON array, e.g. [{"id":"1","price":120,"quantity":5,"discount":10,"tax":[{"id":"6"}]}]. ' +
        "Each needs `id` and `price`; `quantity` is the key (a typo in Alegra's own example reads " +
        '"quant,ity").',
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "draft", label: "Draft" }, { value: "open", label: "Open" }],
      hint: "Defaults to draft unless payments are attached.",
    },
    { key: "observations", label: "Observations", type: "text" },
    {
      key: "anotation",
      label: "Notes (printed)",
      type: "text",
      hint: "Alegra spells this field `anotation`.",
    },
    { key: "termsConditions", label: "Terms and conditions", type: "text" },
    {
      key: "numberTemplateId",
      label: "Numbering ID",
      type: "string",
      hint: "Defaults to the account's preferred numbering when omitted.",
    },
    { key: "sellerId", label: "Seller ID", type: "string" },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      hint: "JSON object merged into the body for country-specific fields (stamp, cfdiUse, " +
        "paymentMethod, currency, …). Keys here win over the fields above.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Invoice ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const items = jsonArray(input.items, "items");
    if (!items || items.length === 0) throw new Error("items must be a non-empty JSON array");
    const client = new AlegraClient(ctx);
    return await client.request("/invoices", {
      method: "POST",
      body: {
        ...compact({
          date: input.date,
          dueDate: input.dueDate,
          status: input.status,
          observations: input.observations,
          anotation: input.anotation,
          termsConditions: input.termsConditions,
          client: ref(input.clientId),
          numberTemplate: ref(input.numberTemplateId),
          seller: ref(input.sellerId),
        }),
        items,
        ...jsonObject(input.additionalFields, "additionalFields"),
      },
    });
  },
};

export default invoiceCreate;
