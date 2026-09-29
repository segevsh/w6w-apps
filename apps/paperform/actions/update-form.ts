import type { ActionDefinition } from "@w6w/types";
import { PaperformClient } from "../lib/client.ts";
import { slugOrIdParam } from "../lib/params.ts";

interface Input {
  slugOrId: string;
  title?: string;
  description?: string;
  disabled?: boolean;
  customSlug?: string;
  spaceId?: string;
  translationId?: string;
}

/**
 * `PUT /forms/{slug_or_id}` — update a form's title, description, disabled state, custom
 * slug, space, or translation.
 *
 * Business plan only, per Paperform's own docs. `idempotent: true` — a PUT with the same
 * values leaves the form in the same state no matter how many times it runs.
 */
const updateForm: ActionDefinition<Input> = {
  key: "update-form",
  type: "perform",
  resource: "form",
  title: "Update Form",
  description: "Update a form's title, description, disabled state, custom slug, space, or " +
    "translation. Requires the Business plan.",
  idempotent: true,
  params: [
    slugOrIdParam,
    { key: "title", label: "Title", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "disabled",
      label: "Disabled",
      type: "boolean",
      hint: "Whether the form is disabled (stops accepting submissions).",
    },
    { key: "customSlug", label: "Custom slug", type: "string" },
    {
      key: "spaceId",
      label: "Space ID",
      type: "string",
      advanced: true,
      hint: "Move the form into this space. Must be a space accessible to the user.",
    },
    {
      key: "translationId",
      label: "Translation ID",
      type: "string",
      advanced: true,
      hint: "Use this translation on the form. Leave empty to use the default account " +
        "translation (English).",
    },
  ],
  output: [{ key: "form", type: "object", label: "Updated form" }],

  async execute(input, ctx) {
    const results = await new PaperformClient(ctx).results<{ form?: unknown }>(
      `/forms/${encodeURIComponent(input.slugOrId)}`,
      {
        method: "PUT",
        body: {
          title: input.title,
          description: input.description,
          disabled: input.disabled,
          custom_slug: input.customSlug,
          space_id: input.spaceId,
          translation_id: input.translationId,
        },
      },
    );
    return { form: results?.form };
  },
};

export default updateForm;
