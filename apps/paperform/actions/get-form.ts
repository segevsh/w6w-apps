import type { ActionDefinition } from "@w6w/types";
import { PaperformClient } from "../lib/client.ts";
import { slugOrIdParam } from "../lib/params.ts";

interface Input {
  slugOrId: string;
}

/** `GET /forms/{slug_or_id}` — a specific form by slug, custom slug, or ID. */
const getForm: ActionDefinition<Input> = {
  key: "get-form",
  type: "read",
  resource: "form",
  title: "Get Form",
  description: "Get a specific form by slug, custom slug, or ID.",
  params: [slugOrIdParam],
  output: [{ key: "form", type: "object", label: "Form" }],

  async execute(input, ctx) {
    const results = await new PaperformClient(ctx).results<{ form?: unknown }>(
      `/forms/${encodeURIComponent(input.slugOrId)}`,
    );
    return { form: results?.form };
  },
};

export default getForm;
