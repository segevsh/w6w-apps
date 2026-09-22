import type { ActionDefinition } from "@w6w/types";
import { EcwidClient, encodeId, mergeBody } from "../lib/client.ts";
import { categoryIdParam, extraFieldsParam } from "../lib/params.ts";

/**
 * `PUT /categories/{categoryId}` — update a category.
 *
 * The page's own example is a two-field body (`{"description": "Temporary
 * hidden", "enabled": false}`), which is the shape this action produces: only
 * the fields the caller set are sent, so a partial update stays partial.
 *
 * `productIds` is deliberately **not** exposed here even though the update page
 * documents it: it "Requires `productIds=true` query param", and the vendor
 * gives dedicated endpoints for assigning and unassigning products
 * (`/categories/.../assign-products-to-the-category`), which do not risk
 * replacing a category's whole membership by accident.
 *
 * Answers `{"updateCount": 1}`. Idempotent: the same body leaves the same state.
 */
interface Input {
  categoryId: string;
  name?: string;
  parentId?: number;
  orderBy?: number;
  description?: string;
  enabled?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  customSlug?: string;
  extraFields?: unknown;
}

const categoryUpdate: ActionDefinition<Input> = {
  key: "category-update",
  type: "perform",
  resource: "category",
  title: "Update Category",
  description:
    "Update a category. Fields left empty are not sent, so they keep their current value.",
  idempotent: true,
  params: [
    categoryIdParam,
    { key: "name", label: "Name", type: "string" },
    {
      key: "parentId",
      label: "Parent category ID",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Moves the category (and its subtree) under another parent. `0` is the top level.",
    },
    { key: "orderBy", label: "Sort order", type: "number", validation: { integer: true, min: 0 } },
    { key: "description", label: "Description", type: "text", hint: "HTML is accepted." },
    {
      key: "enabled",
      label: "Enabled",
      type: "boolean",
      hint: "Off hides the category from the storefront without deleting it.",
    },
    { key: "seoTitle", label: "SEO title", type: "string", advanced: true },
    { key: "seoDescription", label: "SEO description", type: "string", advanced: true },
    { key: "customSlug", label: "Custom slug", type: "string", advanced: true },
    extraFieldsParam,
  ],
  output: [
    { key: "updateCount", type: "number", label: "1 when the category was updated" },
  ],

  execute(input, ctx) {
    const body = mergeBody({
      name: input.name,
      parentId: input.parentId,
      orderBy: input.orderBy,
      description: input.description,
      enabled: input.enabled,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      customSlug: input.customSlug,
    }, input.extraFields);
    return new EcwidClient(ctx).json(`/categories/${encodeId(input.categoryId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default categoryUpdate;
