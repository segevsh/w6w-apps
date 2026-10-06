import type { ActionDefinition } from "@w6w/types";
import { compact, LexwareClient } from "../lib/client.ts";
import { ACTION_RESULT_OUTPUT } from "../lib/factory.ts";

/**
 * `POST /v1/articles` — required: `title`, `type`, `unitName` and `price` (`leadingPrice`,
 * `taxRate`, plus `netPrice` for a NET leading price or `grossPrice` for GROSS). Lexware
 * computes the other price from the leading one.
 */
interface Input {
  title: string;
  type: "PRODUCT" | "SERVICE";
  unitName: string;
  leadingPrice: "NET" | "GROSS";
  price: number;
  taxRate: number;
  articleNumber?: string;
  gtin?: string;
  description?: string;
  note?: string;
}

const articleCreate: ActionDefinition<Input> = {
  key: "article-create",
  type: "perform",
  resource: "article",
  title: "Create Article",
  description: "Create a product or service article for use on sales documents.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      default: "PRODUCT",
      options: [{ value: "PRODUCT", label: "Product" }, { value: "SERVICE", label: "Service" }],
    },
    { key: "unitName", label: "Unit name", type: "string", required: true, hint: "e.g. Stück" },
    {
      key: "leadingPrice",
      label: "Price is",
      type: "select",
      required: true,
      default: "NET",
      options: [{ value: "NET", label: "Net" }, { value: "GROSS", label: "Gross" }],
    },
    { key: "price", label: "Price", type: "number", required: true },
    {
      key: "taxRate",
      label: "Tax rate %",
      type: "number",
      required: true,
      hint: "As of March 2024 Lexware accepts 0, 7 and 19.",
    },
    { key: "articleNumber", label: "Article number", type: "string" },
    { key: "gtin", label: "GTIN", type: "string", hint: "GTIN-8, -12, -13 or -14." },
    { key: "description", label: "Description", type: "text" },
    { key: "note", label: "Internal note", type: "text" },
  ],
  output: ACTION_RESULT_OUTPUT,
  async execute(input, ctx) {
    if (!String(input.title ?? "").trim()) throw new Error("Title is required");
    if (!String(input.unitName ?? "").trim()) throw new Error("Unit name is required");
    if (typeof input.price !== "number" || Number.isNaN(input.price)) {
      throw new Error("Price is required");
    }
    if (typeof input.taxRate !== "number" || Number.isNaN(input.taxRate)) {
      throw new Error("Tax rate is required");
    }
    const gross = input.leadingPrice === "GROSS";
    return await new LexwareClient(ctx).json("/articles", {
      method: "POST",
      body: compact({
        title: input.title,
        type: input.type,
        unitName: input.unitName,
        articleNumber: input.articleNumber,
        gtin: input.gtin,
        description: input.description,
        note: input.note,
        price: {
          leadingPrice: gross ? "GROSS" : "NET",
          [gross ? "grossPrice" : "netPrice"]: input.price,
          taxRate: input.taxRate,
        },
      }),
    });
  },
};

export default articleCreate;
