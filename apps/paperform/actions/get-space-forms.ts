import type { ActionDefinition } from "@w6w/types";
import { PaperformClient } from "../lib/client.ts";
import { spaceIdParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/**
 * `GET /spaces/{id}/forms` — the forms inside a space.
 *
 * Business plan only, per Paperform's own docs. This endpoint's own response schema (in
 * Paperform's OpenAPI document, as read on 2026-09-29) points its `forms` array at the
 * `FormFieldCollectionItem` schema rather than `Form` — almost certainly a copy-paste slip in
 * the vendor's own spec, since every other forms-list endpoint here (`list-forms`,
 * `list-form-fields`) uses the schema its name implies. Not "fixed" here: the response is
 * returned as-is, whatever the server actually sends.
 */
const getSpaceForms: ActionDefinition<Input> = {
  key: "get-space-forms",
  type: "search",
  resource: "space",
  title: "Get Space Forms",
  description: "List the forms inside a space. Requires the Business plan.",
  params: [spaceIdParam],
  output: [{ key: "forms", type: "array", label: "Forms" }],

  async execute(input, ctx) {
    const results = await new PaperformClient(ctx).results<{ forms?: unknown[] }>(
      `/spaces/${encodeURIComponent(input.id)}/forms`,
    );
    return { forms: results?.forms ?? [] };
  },
};

export default getSpaceForms;
