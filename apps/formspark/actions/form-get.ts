import type { ActionDefinition } from "@w6w/types";
import { FormsparkClient, seg } from "../lib/client.ts";
import { formIdParam, formOutput } from "../lib/params.ts";

interface Input {
  formId: string;
}

/**
 * `GET /forms/{formId}` — one form and its settings. Captcha secret keys, the Slack token and
 * the Zapier key live only in the dashboard and are never part of this response.
 */
const formGet: ActionDefinition<Input> = {
  key: "form-get",
  type: "read",
  resource: "form",
  title: "Get Form",
  description: "Fetch a form and its settings. Requires an upgraded workspace and forms:read.",
  params: [formIdParam],
  output: formOutput,

  execute(input, ctx) {
    return new FormsparkClient(ctx).get(`/forms/${seg(input.formId, "formId")}`);
  },
};

export default formGet;
