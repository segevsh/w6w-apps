import type { ActionDefinition } from "@w6w/types";
import { compact, DiscourseClient, unset } from "../lib/client.ts";
import { categoryOutput } from "../lib/params.ts";

/**
 * `POST /categories.json`.
 *
 * `name` is the only required field. The colours are the detail worth stating:
 * Discourse takes them as **bare six-digit hex without a leading `#`** — the
 * reference's own examples are `49d9e9` for `color` and `f0fcfd` for
 * `text_color`. A `#` prefix is a silent 422, so the validation pattern rejects
 * it in the form instead.
 *
 * `permissions` is a map of group name to permission level, e.g.
 * `{ "everyone": 1, "staff": 2 }`. The levels are Discourse's
 * `CategoryGroup.permission_types`: 1 full, 2 create post, 3 read only. Those
 * three are named in the hint; they are not part of the published request
 * schema, which types the object loosely, so the param is `json` rather than a
 * set of selects that would pretend to more structure than the API declares.
 */
interface Input {
  name: string;
  slug?: string;
  color?: string;
  textColor?: string;
  parentCategoryId?: number;
  permissions?: unknown;
  allowBadges?: boolean;
  topicFeaturedLinksAllowed?: boolean;
}

const categoryCreate: ActionDefinition<Input> = {
  key: "category-create",
  type: "perform",
  resource: "category",
  title: "Create Category",
  description: "Add a category to the forum.",
  // Discourse mints a new category per call; names are not a unique key it
  // converges on.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "slug",
      label: "Slug",
      type: "string",
      hint: "Derived from the name when omitted.",
    },
    {
      key: "color",
      label: "Colour",
      type: "string",
      row: "colors",
      placeholder: "49d9e9",
      hint: "Six hex digits, no leading `#`.",
      validation: { pattern: "^[0-9a-fA-F]{6}$" },
    },
    {
      key: "textColor",
      label: "Text colour",
      type: "string",
      row: "colors",
      placeholder: "f0fcfd",
      hint: "Six hex digits, no leading `#`.",
      validation: { pattern: "^[0-9a-fA-F]{6}$" },
    },
    {
      key: "parentCategoryId",
      label: "Parent category ID",
      type: "number",
      hint: "Makes this a subcategory.",
      validation: { integer: true },
    },
    {
      key: "permissions",
      label: "Permissions",
      type: "json",
      advanced: true,
      hint: '{ "everyone": 1, "staff": 2 } — 1 full, 2 create post, 3 read only.',
    },
    { key: "allowBadges", label: "Allow badges", type: "boolean", advanced: true },
    {
      key: "topicFeaturedLinksAllowed",
      label: "Allow featured links",
      type: "boolean",
      advanced: true,
    },
  ],
  output: [
    { key: "category", type: "object", label: "Category" },
    ...categoryOutput.map((f) => ({ ...f, key: `category.${f.key}` })),
  ],

  execute(input, ctx) {
    return new DiscourseClient(ctx).request("/categories.json", {
      method: "POST",
      body: compact({
        name: input.name,
        slug: unset(input.slug),
        color: unset(input.color),
        text_color: unset(input.textColor),
        parent_category_id: input.parentCategoryId,
        permissions: input.permissions,
        allow_badges: input.allowBadges,
        topic_featured_links_allowed: input.topicFeaturedLinksAllowed,
      }),
    });
  },
};

export default categoryCreate;
