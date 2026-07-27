import type { ActionDefinition } from "@w6w/types";
import { WooCommerceClient } from "../lib/client.ts";

interface Input {
  name: string;
  type?: string;
  status?: string;
  sku?: string;
  regularPrice?: string;
  salePrice?: string;
  description?: string;
  shortDescription?: string;
  categories?: number[];
  tags?: number[];
  manageStock?: boolean;
  stockQuantity?: number;
  stockStatus?: string;
  weight?: string;
  featured?: boolean;
  virtual?: boolean;
  downloadable?: boolean;
}

interface ProductBody {
  name: string;
  type?: string;
  status?: string;
  sku?: string;
  regular_price?: string;
  sale_price?: string;
  description?: string;
  short_description?: string;
  categories?: Array<{ id: number }>;
  tags?: Array<{ id: number }>;
  manage_stock?: boolean;
  stock_quantity?: number;
  stock_status?: string;
  weight?: string;
  featured?: boolean;
  virtual?: boolean;
  downloadable?: boolean;
}

const productCreate: ActionDefinition<Input> = {
  key: "product-create",
  type: "perform",
  resource: "product",
  title: "Create Product",
  description: "Create a new product in the store catalog.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "simple", label: "Simple" },
        { value: "grouped", label: "Grouped" },
        { value: "external", label: "External" },
        { value: "variable", label: "Variable" },
      ],
      default: "simple",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "draft", label: "Draft" },
        { value: "pending", label: "Pending" },
        { value: "private", label: "Private" },
        { value: "publish", label: "Publish" },
      ],
      default: "publish",
    },
    { key: "sku", label: "SKU", type: "string" },
    { key: "regularPrice", label: "Regular Price", type: "string" },
    { key: "salePrice", label: "Sale Price", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "shortDescription", label: "Short Description", type: "text" },
    { key: "categories", label: "Category IDs", type: "multiselect" },
    { key: "tags", label: "Tag IDs", type: "multiselect" },
    { key: "manageStock", label: "Manage Stock", type: "boolean", default: false },
    { key: "stockQuantity", label: "Stock Quantity", type: "number" },
    {
      key: "stockStatus",
      label: "Stock Status",
      type: "select",
      options: [
        { value: "instock", label: "In Stock" },
        { value: "outofstock", label: "Out Of Stock" },
        { value: "onbackorder", label: "On Back Order" },
      ],
    },
    { key: "weight", label: "Weight", type: "string" },
    { key: "featured", label: "Featured", type: "boolean", default: false },
    { key: "virtual", label: "Virtual", type: "boolean", default: false },
    { key: "downloadable", label: "Downloadable", type: "boolean", default: false },
  ],
  output: [
    { key: "id", type: "number", label: "Product ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "type", type: "string", label: "Type" },
    { key: "status", type: "string", label: "Status" },
    { key: "sku", type: "string", label: "SKU" },
    { key: "price", type: "string", label: "Price" },
    { key: "stock_status", type: "string", label: "Stock Status" },
    { key: "permalink", type: "string", label: "Permalink" },
  ],

  execute(input, ctx) {
    const client = WooCommerceClient.fromConnection(ctx);
    const body: ProductBody = { name: input.name };
    if (input.type !== undefined) body.type = input.type;
    if (input.status !== undefined) body.status = input.status;
    if (input.sku !== undefined) body.sku = input.sku;
    if (input.regularPrice !== undefined) body.regular_price = input.regularPrice;
    if (input.salePrice !== undefined) body.sale_price = input.salePrice;
    if (input.description !== undefined) body.description = input.description;
    if (input.shortDescription !== undefined) body.short_description = input.shortDescription;
    if (input.categories !== undefined) body.categories = input.categories.map((id) => ({ id }));
    if (input.tags !== undefined) body.tags = input.tags.map((id) => ({ id }));
    if (input.manageStock !== undefined) body.manage_stock = input.manageStock;
    if (input.stockQuantity !== undefined) body.stock_quantity = input.stockQuantity;
    if (input.stockStatus !== undefined) body.stock_status = input.stockStatus;
    if (input.weight !== undefined) body.weight = input.weight;
    if (input.featured !== undefined) body.featured = input.featured;
    if (input.virtual !== undefined) body.virtual = input.virtual;
    if (input.downloadable !== undefined) body.downloadable = input.downloadable;
    return client.request("/products", { method: "POST", body });
  },
};

export default productCreate;
