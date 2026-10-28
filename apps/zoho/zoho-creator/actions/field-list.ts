import type { ActionDefinition } from "@w6w/types";
import { environmentHeaders, ZohoCreatorClient } from "../lib/client.ts";
import { accountOwnerName, appLinkName, environmentParam, formLinkName } from "../lib/params.ts";

interface Input {
  accountOwnerName: string;
  appLinkName: string;
  formLinkName: string;
  environment?: string;
}

interface Output {
  fields: Array<Record<string, unknown>>;
}

/**
 * `GET /creator/v2/meta/<owner>/<app>/form/<form>/fields` — Get Fields. Needs
 * `ZohoCreator.meta.form.READ`. Each returned field's `link_name` is the key
 * `record-add`/`record-update`'s `data` object and `record-list`'s `criteria`
 * param address. Verified against `get-fields.html`.
 */
const fieldList: ActionDefinition<Input, Output> = {
  key: "field-list",
  type: "read",
  resource: "field",
  title: "List Fields",
  description: "List every field's metadata (link name, type, mandatory/unique flags, " +
    "choices, subform fields) for a form.",
  params: [accountOwnerName, appLinkName, formLinkName, environmentParam],
  output: [{ key: "fields", type: "array", label: "Fields" }],

  async execute(input, ctx) {
    const data = await new ZohoCreatorClient(ctx).request<
      { fields?: Array<Record<string, unknown>> }
    >(
      `/meta/${encodeURIComponent(input.accountOwnerName)}/${
        encodeURIComponent(input.appLinkName)
      }/form/${encodeURIComponent(input.formLinkName)}/fields`,
      { headers: environmentHeaders(input) },
    );
    return { fields: data.fields ?? [] };
  },
};

export default fieldList;
