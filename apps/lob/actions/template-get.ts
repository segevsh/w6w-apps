import type { ActionDefinition } from "@w6w/types";
import { encodeId, LobClient } from "../lib/client.ts";

interface Input {
  templateId: string;
}

const templateGet: ActionDefinition<Input> = {
  key: "template-get",
  type: "read",
  resource: "template",
  title: "Get Template",
  description: "Retrieve a template, its published version and its versions.",
  params: [{
    key: "templateId",
    label: "Template ID",
    type: "string",
    required: true,
    placeholder: "tmpl_…",
    hint: "Lob ids start with `tmpl_`.",
  }],
  output: [
    { key: "id", type: "string", label: "Template ID" },
    { key: "description", type: "string", label: "Description" },
    { key: "published_version", type: "object", label: "Published version" },
    { key: "versions", type: "array", label: "Versions" },
  ],

  execute(input, ctx) {
    return new LobClient(ctx).json(`/templates/${encodeId(input.templateId)}`);
  },
};

export default templateGet;
