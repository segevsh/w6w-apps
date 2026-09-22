import type { ActionDefinition } from "@w6w/types";
import { EcwidClient, encodeId } from "../lib/client.ts";
import { categoryIdParam, responseFieldsParam } from "../lib/params.ts";

/**
 * `GET /categories/{categoryId}` — one category.
 *
 * Answers the category itself: `id`, `parentId`, `orderBy`, `name`,
 * `description`, `enabled`, `productCount` and `enabledProductCount`, the image
 * and thumbnail URLs, and `productIds` **when `productIds=true`** is asked for.
 * That last part is why this action declares a `productIds` switch: without it
 * the field is simply absent from the response, which reads like "the category
 * is empty".
 */
interface Input {
  categoryId: string;
  productIds?: boolean;
  lang?: string;
  responseFields?: string;
}

const categoryGet: ActionDefinition<Input> = {
  key: "category-get",
  type: "read",
  resource: "category",
  title: "Get Category",
  description: "Fetch one category, optionally with the ids of the products assigned to it.",
  params: [
    categoryIdParam,
    {
      key: "productIds",
      label: "Include product IDs",
      type: "boolean",
      hint:
        "Ecwid only returns the `productIds` field when this is set; without it a category read " +
        "looks as though the category held no products.",
    },
    {
      key: "lang",
      label: "Language",
      type: "string",
      placeholder: "en",
      hint: "ISO 639-1 code for the translated fields.",
    },
    responseFieldsParam,
  ],
  output: [
    { key: "id", type: "number", label: "Category ID" },
    { key: "parentId", type: "number", label: "Parent category ID, 0 at the top level" },
    { key: "name", type: "string", label: "Name" },
    { key: "enabled", type: "boolean", label: "Whether the category is enabled" },
    { key: "productCount", type: "number", label: "Products assigned" },
    { key: "productIds", type: "array", label: "Assigned product IDs, when requested" },
  ],

  execute(input, ctx) {
    return new EcwidClient(ctx).json(`/categories/${encodeId(input.categoryId)}`, {
      query: {
        productIds: input.productIds,
        lang: input.lang,
        responseFields: input.responseFields,
      },
    });
  },
};

export default categoryGet;
