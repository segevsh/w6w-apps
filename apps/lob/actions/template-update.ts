import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, LobClient } from "../lib/client.ts";

interface Input {
  templateId: string;
  description?: string;
  publishedVersion?: string;
}

const templateUpdate: ActionDefinition<Input> = {
  key: "template-update",
  type: "perform",
  resource: "template",
  title: "Update Template",
  description:
    "Change a template's description and/or which version is published (the one mailpieces render). To change the HTML, create a new version instead.",
  idempotent: true,
  params: [
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      required: true,
      placeholder: "tmpl_…",
    },
    { key: "description", label: "Description", type: "string" },
    {
      key: "publishedVersion",
      label: "Published version ID",
      type: "string",
      placeholder: "vrsn_…",
      hint: "Switches the live version; Lob errors if it is deleted or does not exist.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Template ID" },
    { key: "description", type: "string", label: "Description" },
    { key: "published_version", type: "object", label: "Published version" },
    { key: "versions", type: "array", label: "Versions" },
  ],

  execute(input, ctx) {
    const body = compact({
      description: input.description,
      published_version: input.publishedVersion,
    });
    if (Object.keys(body).length === 0) {
      throw new Error("Give a description and/or a published version to update");
    }
    return new LobClient(ctx).json(`/templates/${encodeId(input.templateId)}`, {
      method: "POST",
      body,
    });
  },
};

export default templateUpdate;
