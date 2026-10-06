import type { ActionDefinition } from "@w6w/types";
import { AlegraClient, compact, idPath, jsonObject, ref, stringList } from "../lib/client.ts";

interface Input {
  id: string;
  name?: string;
  price?: number;
  description?: string;
  reference?: string;
  status?: string;
  taxIds?: string;
  categoryId?: string;
  additionalFields?: unknown;
}

const itemUpdate: ActionDefinition<Input> = {
  key: "item-update",
  type: "perform",
  resource: "item",
  title: "Update Item",
  description:
    "Edit a product or service. An INACTIVE item cannot be edited: set Status to active in the same call to reactivate it.",
  idempotent: true,
  params: [
    { key: "id", label: "Item ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", validation: { maxLength: 150 } },
    { key: "price", label: "Price", type: "number" },
    { key: "description", label: "Description", type: "text", validation: { maxLength: 500 } },
    { key: "reference", label: "Reference", type: "string", validation: { maxLength: 45 } },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }],
    },
    {
      key: "taxIds",
      label: "Tax IDs",
      type: "string",
      hint: "Tax ids separated by commas. Replaces the item's taxes when set.",
    },
    { key: "categoryId", label: "Accounting category ID", type: "string" },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      hint: "JSON object merged into the body.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Item ID" }],

  async execute(input, ctx) {
    const taxes = stringList(input.taxIds).map((id) => ({ id }));
    const client = new AlegraClient(ctx);
    return await client.request(`/items/${idPath(input.id)}`, {
      method: "PUT",
      body: {
        ...compact({
          name: input.name,
          price: input.price,
          description: input.description,
          reference: input.reference,
          status: input.status,
          category: ref(input.categoryId),
        }),
        ...(taxes.length > 0 ? { tax: taxes } : {}),
        ...jsonObject(input.additionalFields, "additionalFields"),
      },
    });
  },
};

export default itemUpdate;
