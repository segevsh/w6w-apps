import type { ActionDefinition } from "@w6w/types";
import { EcwidClient, mergeBody } from "../lib/client.ts";
import { extraFieldsParam } from "../lib/params.ts";

/**
 * `POST /categories` — create a category.
 *
 * `name` is the only field the vendor marks **Required**. `parentId` defaults to
 * `0` — "the main store category" — when omitted, i.e. the new category lands at
 * the store's top level, which is worth knowing before creating one by accident.
 *
 * `orderBy` starts at `10` and increments by `10`, so there is room to insert
 * between existing categories without renumbering.
 *
 * Answers `{"id": <new category id>}`.
 *
 * Not idempotent: Ecwid mints the id and accepts no idempotency key, so a
 * retried create makes a second category.
 */
interface Input {
  name: string;
  parentId?: number;
  orderBy?: number;
  description?: string;
  enabled?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  customSlug?: string;
  extraFields?: unknown;
}

const categoryCreate: ActionDefinition<Input> = {
  key: "category-create",
  type: "perform",
  resource: "category",
  title: "Create Category",
  description: "Create a category. The name is required; the API puts it at the top level unless " +
    "a parent is given.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "parentId",
      label: "Parent category ID",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Leave empty for `0`, the store's main category — that is the API's own default, not " +
        "a guess.",
    },
    {
      key: "orderBy",
      label: "Sort order",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Starts at 10 and steps by 10; lower numbers sort first.",
    },
    { key: "description", label: "Description", type: "text", hint: "HTML is accepted." },
    { key: "enabled", label: "Enabled", type: "boolean" },
    {
      key: "seoTitle",
      label: "SEO title",
      type: "string",
      advanced: true,
      hint: "Recommended under 55 characters.",
    },
    {
      key: "seoDescription",
      label: "SEO description",
      type: "string",
      advanced: true,
      hint: "Recommended under 160 characters.",
    },
    {
      key: "customSlug",
      label: "Custom slug",
      type: "string",
      advanced: true,
      hint: "Overrides the auto-generated slug in the category's storefront URL.",
    },
    extraFieldsParam,
  ],
  output: [{ key: "id", type: "number", label: "ID of the created category" }],

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
    return new EcwidClient(ctx).json("/categories", { method: "POST", body });
  },
};

export default categoryCreate;
