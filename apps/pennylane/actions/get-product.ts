import type { ActionDefinition } from "@w6w/types";
import { PennylaneClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /products/{id}` — one product.
 *
 * `price_before_tax` is the raw string the vendor stores; `price` is its
 * derived, formatted companion. `vat_rate` is the vendor's rate code
 * (`FR_200` is 20%), and `substance` says whether the product's revenue posts
 * to the goods or the services ledger account.
 */
interface Input {
  id: string;
}

const getProduct: ActionDefinition<Input> = {
  key: "get-product",
  type: "read",
  resource: "product",
  title: "Get Product",
  description: "Fetch one product by id (GET /products/{id}).",
  params: [idParam("Product")],
  output: [
    { key: "id", type: "number", label: "Product ID" },
    { key: "label", type: "string", label: "Label" },
    { key: "description", type: "string", label: "Description" },
    { key: "external_reference", type: "string", label: "External reference" },
    { key: "price_before_tax", type: "string", label: "Price before tax" },
    { key: "price", type: "string", label: "Formatted price" },
    { key: "vat_rate", type: "string", label: "VAT rate code" },
    { key: "unit", type: "string", label: "Unit" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "reference", type: "string", label: "Reference" },
    { key: "substance", type: "string", label: "Goods or services" },
    { key: "ledger_account", type: "object", label: "Ledger account" },
    { key: "custom_fields", type: "array", label: "Custom fields" },
    { key: "archived_at", type: "string", label: "Archived at" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],

  execute(input, ctx) {
    return new PennylaneClient(ctx).request(`/products/${input.id}`);
  },
};

export default getProduct;
