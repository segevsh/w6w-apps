import type { ActionDefinition } from "@w6w/types";
import { AlegraClient, compact, jsonObject, ref, stringList } from "../lib/client.ts";

interface Input {
  name: string;
  price: number;
  description?: string;
  reference?: string;
  type?: string;
  taxIds?: string;
  categoryId?: string;
  additionalFields?: unknown;
}

const itemCreate: ActionDefinition<Input> = {
  key: "item-create",
  type: "perform",
  resource: "item",
  title: "Create Item",
  description: "Create a product or service with a single general price.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, validation: { maxLength: 150 } },
    {
      key: "price",
      label: "Price",
      type: "number",
      required: true,
      hint: "General price. For per-price-list prices pass `price` in Additional fields instead.",
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      validation: { maxLength: 500 },
    },
    { key: "reference", label: "Reference", type: "string", validation: { maxLength: 45 } },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "product", label: "Product" },
        { value: "service", label: "Service" },
        { value: "variantParent", label: "Variant parent" },
        { value: "kit", label: "Kit" },
      ],
    },
    {
      key: "taxIds",
      label: "Tax IDs",
      type: "string",
      hint: "Tax ids separated by commas (see List Taxes).",
    },
    { key: "categoryId", label: "Accounting category ID", type: "string" },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      hint:
        "JSON object merged into the body (inventory, itemCategory, customFields, subitems, …).",
    },
  ],
  output: [{ key: "id", type: "string", label: "Item ID" }],

  async execute(input, ctx) {
    const taxes = stringList(input.taxIds).map((id) => ({ id }));
    const client = new AlegraClient(ctx);
    return await client.request("/items", {
      method: "POST",
      body: {
        ...compact({
          name: input.name,
          price: input.price,
          description: input.description,
          reference: input.reference,
          type: input.type,
          category: ref(input.categoryId),
        }),
        ...(taxes.length > 0 ? { tax: taxes } : {}),
        ...jsonObject(input.additionalFields, "additionalFields"),
      },
    });
  },
};

export default itemCreate;
