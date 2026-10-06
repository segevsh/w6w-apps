import type { ActionDefinition } from "@w6w/types";
import { encodeId, YouformClient } from "../lib/client.ts";

interface Input {
  form: string;
}

/**
 * `GET /api/forms/{slug}` — one form, addressed by its public slug (the code in
 * its share URL, e.g. `kyir3qrg`), not its numeric id. The response carries the
 * published `fields` and the editor's `draft_fields`, each a list of blocks with
 * ids — the same ids that key a submission's `data`.
 */
const formGet: ActionDefinition<Input> = {
  key: "form-get",
  type: "read",
  resource: "form",
  title: "Get form",
  description: "Get a form's definition, including its blocks, by slug.",
  params: [
    {
      key: "form",
      label: "Form slug",
      type: "string",
      required: true,
      hint: "The slug in the form's share link (youform.com/forms/<slug>), not the numeric id.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Form: id, name, fields, draft_fields, …" }],

  execute(input, ctx) {
    return new YouformClient(ctx).json(`/forms/${encodeId(input.form)}`);
  },
};

export default formGet;
