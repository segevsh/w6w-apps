import type { ActionDefinition } from "@w6w/types";
import { API_V2, changeBody, jsonParam, SquarespaceClient } from "../lib/client.ts";
import { productOutput } from "../lib/params.ts";

/**
 * `POST /v2/commerce/products/{productId}` — update a product.
 *
 * **It is a `POST`, not a `PATCH` or a `PUT`** — verified on the live page's
 * method column, where `updateProduct` is `post` while every other update in
 * this app's surface is a verb you would expect.
 *
 * ## The Change wrapper is built here, not by the caller
 *
 * Each updatable field is wrapped `{ "present": true, "value": … }`, which is
 * how the vendor lets a caller say "leave this alone" as distinct from "set it
 * to `null`". The action's params are the plain fields — `{present, value}` is
 * built by `changeBody()`, so a workflow author never writes it. A field left
 * empty is **absent** from the body (unchanged); a field set to `""`, `null` or
 * `false` is sent as that value. Supplying no updatable field at all is
 * rejected rather than sent as an empty no-op.
 *
 * ## `pricing` carries a second, nested level of the same convention
 *
 * The vendor's `pricing` member is a Change whose own value holds Change-wrapped
 * `basePrice`, `onSale` and `salePrice`. Because the outer wrapper is built for
 * you but the inner ones are part of the value you supply, the hint shows the
 * documented shape — otherwise a body that looks right (`pricing: {basePrice:
 * {currency, value}}`) is quietly rejected.
 */
interface Input {
  productId: string;
  name?: string;
  description?: string;
  isVisible?: boolean;
  tags?: string[];
  urlSlug?: string;
  pricing?: unknown;
  productAttributeNames?: unknown;
  seoData?: unknown;
}

const updateProduct: ActionDefinition<Input, Record<string, unknown>> = {
  key: "update-product",
  type: "perform",
  resource: "product",
  title: "Update Product",
  description:
    "Update a product's name, description, visibility, tags, URL slug, pricing, attribute " +
    "names or SEO data. Every field is optional and sent in Squarespace's `{present, value}` " +
    "Change wrapper, which this action builds for you.",
  idempotent: true,
  params: [
    {
      key: "productId",
      label: "Product id",
      type: "string",
      required: true,
      hint: "The product's `id` from List products.",
    },
    { key: "name", label: "Name", type: "string", advanced: true },
    { key: "description", label: "Description", type: "text", advanced: true },
    {
      key: "isVisible",
      label: "Visible",
      type: "boolean",
      advanced: true,
      hint: "Send `false` to hide the product; leave empty to leave it unchanged.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "array",
      item: { type: "string", placeholder: "summer-sale" },
      advanced: true,
      hint: "Replaces the whole tag list.",
    },
    { key: "urlSlug", label: "URL slug", type: "string", advanced: true },
    {
      key: "pricing",
      label: "Pricing",
      type: "json",
      advanced: true,
      placeholder: '{"basePrice":{"present":true,"value":{"currency":"USD","value":29.99}},' +
        '"onSale":{"present":true,"value":false}}',
      hint: "The vendor nests its Change wrapper one level deeper here: the *value* of " +
        "`pricing` holds `basePrice`, `onSale` and `salePrice`, each itself " +
        "`{present, value}`. The outer wrapper is built for you; these inner ones are part of " +
        "the value you supply.",
    },
    {
      key: "productAttributeNames",
      label: "Product attribute names",
      type: "json",
      advanced: true,
      placeholder: '["Color","Size"]',
      hint: "Replaces the variant attribute names (e.g. Color, Size) for the product.",
    },
    {
      key: "seoData",
      label: "SEO data",
      type: "json",
      advanced: true,
      placeholder: '{"title":"…","description":"…"}',
      hint: "Overrides the search-engine title and description. Omitted members fall back to " +
        "the product's own name and description.",
    },
  ],
  output: productOutput,

  execute(input, ctx) {
    const body = changeBody({
      name: input.name,
      description: input.description,
      isVisible: input.isVisible,
      tags: input.tags,
      urlSlug: input.urlSlug,
      pricing: jsonParam(input.pricing, "pricing"),
      productAttributeNames: jsonParam(input.productAttributeNames, "productAttributeNames"),
      seoData: jsonParam(input.seoData, "seoData"),
    });
    if (Object.keys(body).length === 0) {
      throw new Error(
        "supply at least one field to change — Squarespace treats a body with no Change " +
          "members as a no-op",
      );
    }

    const productId = encodeURIComponent(String(input.productId ?? "").trim());
    return new SquarespaceClient(ctx).post<Record<string, unknown>>(
      `${API_V2}/commerce/products/${productId}`,
      body,
    );
  },
};

export default updateProduct;
