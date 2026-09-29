import type { ActionDefinition } from "@w6w/types";
import { environmentHeaders, ZohoCreatorClient } from "../lib/client.ts";
import { accountOwnerName, appLinkName, environmentParam } from "../lib/params.ts";

interface Input {
  accountOwnerName: string;
  appLinkName: string;
  environment?: string;
}

interface Output {
  forms: Array<Record<string, unknown>>;
}

/**
 * `GET /creator/v2/meta/<owner>/<app>/forms` — Get Forms. Needs
 * `ZohoCreator.meta.application.READ`. Each returned form's `link_name` is the
 * `formLinkName` param `record-add`/`file-upload`/`field-list` expect. Verified
 * against `get-forms.html`.
 */
const formList: ActionDefinition<Input, Output> = {
  key: "form-list",
  type: "read",
  resource: "form",
  title: "List Forms",
  description: "List every form in a Zoho Creator application.",
  params: [accountOwnerName, appLinkName, environmentParam],
  output: [{ key: "forms", type: "array", label: "Forms" }],

  async execute(input, ctx) {
    const data = await new ZohoCreatorClient(ctx).request<
      { forms?: Array<Record<string, unknown>> }
    >(
      `/meta/${encodeURIComponent(input.accountOwnerName)}/${
        encodeURIComponent(input.appLinkName)
      }/forms`,
      { headers: environmentHeaders(input) },
    );
    return { forms: data.forms ?? [] };
  },
};

export default formList;
