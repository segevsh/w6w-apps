import type { ActionDefinition } from "@w6w/types";
import { CircleClient, compact, unset } from "../lib/client.ts";
import { spaceOutput, spaceTypeOptions } from "../lib/params.ts";

/**
 * `POST /spaces` — create a space.
 *
 * ## `space_type` is not a label, it decides what the space can hold
 *
 * Circle's description: "space_type defaults to 'basic' if not provided. Use
 * course_setting for course-type spaces. Access levels are controlled via
 * is_private and is_hidden_from_non_members."
 *
 * The type is fixed at creation and governs which other endpoints will accept
 * the space at all — `post-create` requires a `basic` space ("Creates a basic
 * post in a basic-type space"), `event-list`'s `space_id` filter wants an event
 * space, and so on. Getting it wrong is not a cosmetic mistake, so it is a
 * front-line param with the six values enumerated from the endpoint's own enum.
 *
 * ## Privacy is two flags, not one
 *
 * `is_private` controls whether non-members can *read* the space;
 * `is_hidden_from_non_members` controls whether they can *see that it exists*.
 * They are independent, and a "secret" space is both. Circle's create schema
 * exposes 47 properties in total; the ones here are the ones that determine what
 * kind of space you get. The rest are presentation defaults that are easier to
 * set in Circle's own UI than to describe in a form, and every one of them is
 * editable afterwards.
 *
 * Not idempotent: Circle mints a new space per call and has no create-or-update
 * form. A retry produces a second space, distinguishable only by its slug.
 */
interface Input {
  name: string;
  slug: string;
  spaceGroupId: number;
  spaceType?: string;
  isPrivate?: boolean;
  isHiddenFromNonMembers?: boolean;
  isPostDisabled?: boolean;
  emoji?: string;
}

const spaceCreate: ActionDefinition<Input> = {
  key: "space-create",
  type: "perform",
  resource: "space",
  title: "Create Space",
  description: "Create a space. The type is fixed at creation and decides what content it holds.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "spaceGroupId",
      label: "Space group ID",
      type: "number",
      required: true,
      hint: "Which sidebar group the space sits in. `space-group-list` returns the ids.",
      validation: { integer: true },
    },
    {
      key: "slug",
      label: "Slug",
      type: "string",
      required: true,
      placeholder: "product-feedback",
      hint: "URL segment. Required — Circle's create schema lists `name`, `slug` and " +
        "`space_group_id` as the three mandatory fields, so it does NOT derive one for you.",
    },
    {
      key: "spaceType",
      label: "Space type",
      type: "select",
      options: spaceTypeOptions,
      hint: "Fixed at creation. Only a Posts space accepts posts; only an Events space accepts " +
        "events. Circle defaults to Posts.",
    },
    {
      key: "isPrivate",
      label: "Private",
      type: "boolean",
      hint: "Only members of the space can read it. Independent of visibility below.",
    },
    {
      key: "isHiddenFromNonMembers",
      label: "Hidden from non-members",
      type: "boolean",
      hint: "Non-members cannot see that the space exists. Combine with Private for a secret " +
        "space.",
    },
    {
      key: "isPostDisabled",
      label: "Disable member posting",
      type: "boolean",
      advanced: true,
      hint: "Members can read and comment but not start posts — the announcement pattern.",
    },
    { key: "emoji", label: "Emoji", type: "string", advanced: true },
  ],
  output: spaceOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request("/spaces", {
      method: "POST",
      body: compact({
        name: input.name,
        slug: input.slug,
        space_group_id: input.spaceGroupId,
        space_type: unset(input.spaceType),
        // `compact` keeps `false`, and here it is meaningful: `false` is an
        // explicit "public" rather than an absence.
        is_private: input.isPrivate,
        is_hidden_from_non_members: input.isHiddenFromNonMembers,
        is_post_disabled: input.isPostDisabled,
        emoji: unset(input.emoji),
      }),
    });
  },
};

export default spaceCreate;
