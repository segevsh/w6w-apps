import type { ActionDefinition } from "@w6w/types";
import { compact, EconomicClient, ref } from "../lib/client.ts";

interface Input {
  productNumber: string;
  name: string;
  productGroupNumber: number;
  salesPrice?: number;
  costPrice?: number;
  recommendedPrice?: number;
  description?: string;
  unitNumber?: number;
  barred?: boolean;
}

const productCreate: ActionDefinition<Input> = {
  key: "product-create",
  type: "perform",
  resource: "product",
  title: "Create Product",
  description:
    "Create a product. Product number (your own string), name and product group are required by e-conomic.",
  idempotent: false,
  params: [
    { key: "productNumber", label: "Product number", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "productGroupNumber", label: "Product group number", type: "number", required: true },
    { key: "salesPrice", label: "Sales price", type: "number" },
    { key: "costPrice", label: "Cost price", type: "number" },
    { key: "recommendedPrice", label: "Recommended price", type: "number" },
    { key: "description", label: "Description", type: "string" },
    { key: "unitNumber", label: "Unit number", type: "number" },
    { key: "barred", label: "Barred", type: "boolean", hint: "A barred product cannot be sold." },
  ],
  output: [
    { key: "productNumber", type: "string", label: "Product number" },
    { key: "product", type: "object", label: "Created product" },
  ],
  async execute(input, ctx) {
    const product = await new EconomicClient(ctx).request<{ productNumber?: string }>(
      "POST",
      "/products",
      {
        body: compact({
          productNumber: input.productNumber,
          name: input.name,
          productGroup: ref("productGroupNumber", input.productGroupNumber),
          salesPrice: input.salesPrice,
          costPrice: input.costPrice,
          recommendedPrice: input.recommendedPrice,
          description: input.description,
          unit: ref("unitNumber", input.unitNumber),
          barred: input.barred,
        }),
      },
    );
    return { productNumber: product.productNumber, product };
  },
};

export default productCreate;
