import type { ActionDefinition } from "@w6w/types";
import { DocusignClient } from "../lib/client.ts";

interface Input {
  templateId: string;
  include?: string;
}

/**
 * `GET /restapi/v2.1/accounts/{accountId}/templates/{templateId}` —
 * `Templates: get`.
 *
 * The practical use is reading a template's **roles** before filling them:
 * `envelope-create-from-template` matches each `templateRole.roleName` against
 * the names defined here, and a mismatch is a silent no-op — Docusign creates
 * the envelope with the role unfilled rather than erroring. Pass
 * `include=recipients` to see the role names.
 */
const templateGet: ActionDefinition<Input> = {
  key: "template-get",
  type: "read",
  resource: "template",
  title: "Get Template",
  description: "Fetch one template, including its roles and documents.",
  params: [
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      required: true,
      hint: "The template's GUID. Returned by List Templates.",
    },
    {
      key: "include",
      label: "Include",
      type: "string",
      hint:
        "Comma-separated extras: recipients, documents, custom_fields, notification, powerforms, tabs. Use `recipients` to read the template's role names.",
    },
  ],
  output: [
    { key: "templateId", type: "string", label: "Template ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "shared", type: "string", label: "Shared" },
    { key: "recipients", type: "object", label: "Roles (with include=recipients)" },
    { key: "documents", type: "array", label: "Documents (with include=documents)" },
  ],

  execute(input, ctx) {
    return new DocusignClient(ctx).request(`/templates/${encodeURIComponent(input.templateId)}`, {
      query: { include: input.include },
    });
  },
};

export default templateGet;
