import type { ActionDefinition } from "@w6w/types";
import { encodeId, LobClient } from "../lib/client.ts";
import { cancelOutput } from "../lib/params.ts";

interface Input {
  templateId: string;
}

const templateDelete: ActionDefinition<Input> = {
  key: "template-delete",
  type: "perform",
  resource: "template",
  title: "Delete Template",
  description:
    "Delete a template and all of its versions. Mailpieces that reference it by id will fail afterwards.",
  idempotent: true,
  params: [{
    key: "templateId",
    label: "Template ID",
    type: "string",
    required: true,
    placeholder: "tmpl_…",
    hint: "Lob ids start with `tmpl_`.",
  }],
  output: cancelOutput,

  execute(input, ctx) {
    return new LobClient(ctx).json(`/templates/${encodeId(input.templateId)}`, {
      method: "DELETE",
    });
  },
};

export default templateDelete;
