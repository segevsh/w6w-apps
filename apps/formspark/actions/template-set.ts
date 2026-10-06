import type { ActionDefinition } from "@w6w/types";
import { FormsparkClient, seg } from "../lib/client.ts";
import { formIdParam, templateKindParam, templateOutput } from "../lib/params.ts";

interface Input {
  formId: string;
  kind: string;
  code: string;
}

/**
 * `PUT /forms/{formId}/templates/{kind}` — "Writing this replaces whatever the template held,
 * including a layout built in the visual editor", and that cannot be undone. The body is HTML
 * with Handlebars placeholders (`{{data.<field>}}`), inline styles only, 1-262,144 characters.
 * `409` means custom notification templates are switched off; `400 template_invalid` carries an
 * `errors` array and stores nothing. The returned `paused` flag says whether Formspark's content
 * check stopped the template from sending.
 */
const templateSet: ActionDefinition<Input> = {
  key: "template-set",
  type: "perform",
  resource: "template",
  title: "Set Email Template",
  description: "Replace a form's notification or autoresponder template with HTML code. This " +
    "overwrites any visual-editor layout and cannot be undone. Check `paused` in the result.",
  idempotent: true,
  params: [
    formIdParam,
    templateKindParam,
    {
      key: "code",
      label: "Template HTML",
      type: "code",
      required: true,
      validation: { minLength: 1, maxLength: 262144 },
      hint: "HTML with Handlebars placeholders: {{data.<field>}} is a submitted field. Styling " +
        "must be inline.",
    },
  ],
  output: templateOutput,

  execute(input, ctx) {
    return new FormsparkClient(ctx).request(
      `/forms/${seg(input.formId, "formId")}/templates/${seg(input.kind, "kind")}`,
      { method: "PUT", body: { code: input.code } },
    );
  },
};

export default templateSet;
