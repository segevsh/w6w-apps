import type { ActionDefinition } from "@w6w/types";
import { FormsparkClient, seg } from "../lib/client.ts";
import { formIdParam, templateKindParam, templateOutput } from "../lib/params.ts";

interface Input {
  formId: string;
  kind: string;
}

/** `GET /forms/{formId}/templates/{kind}` — kind is `notification` or `autoresponder`. */
const templateGet: ActionDefinition<Input> = {
  key: "template-get",
  type: "read",
  resource: "template",
  title: "Get Email Template",
  description: "Read a form's notification or autoresponder email template.",
  params: [formIdParam, templateKindParam],
  output: templateOutput,

  execute(input, ctx) {
    return new FormsparkClient(ctx).get(
      `/forms/${seg(input.formId, "formId")}/templates/${seg(input.kind, "kind")}`,
    );
  },
};

export default templateGet;
