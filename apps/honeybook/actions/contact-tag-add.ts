import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, HoneyBookClient, nonEmpty, toList } from "../lib/client.ts";
import { contactIncludeParams } from "../lib/params.ts";

interface Input {
  contactId: string;
  tagId: string;
  include?: string[] | string;
  maxActionSuggestions?: number;
  maxWorkspaces?: number;
  maxTags?: number;
  maxCustomFields?: number;
}

const contactTagAdd: ActionDefinition<Input> = {
  key: "contact-tag-add",
  type: "perform",
  resource: "contact",
  title: "Add Contact Tag",
  description: "Tag a contact (idempotent).",
  idempotent: true,
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      required: true,
      hint: "Contact id (BSON ObjectId hex).",
    },
    { key: "tagId", label: "Tag ID", type: "string", required: true, hint: "Tag id." },
    ...contactIncludeParams,
  ],
  output: [
    { key: "id", type: "string", label: "Id" },
    { key: "company_id", type: "string", label: "Company id" },
    { key: "client_id", type: "string", label: "Client id" },
    { key: "vendor_id", type: "string", label: "Vendor id" },
    { key: "user_id", type: "string", label: "User id" },
    { key: "client_organization_id", type: "string", label: "Client organization id" },
    { key: "user", type: "object", label: "User" },
    { key: "kind", type: "string", label: "Kind" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
  ],

  async execute(input, ctx) {
    const body = compact({
      include: toList(input.include),
      max_action_suggestions: input.maxActionSuggestions,
      max_workspaces: input.maxWorkspaces,
      max_tags: input.maxTags,
      max_custom_fields: input.maxCustomFields,
    });
    const result = await new HoneyBookClient(ctx).request(
      "PUT",
      `/contacts/${encodeId(input.contactId)}/tags/${encodeId(input.tagId)}`,
      {
        body: nonEmpty(body),
      },
    );
    return result;
  },
};

export default contactTagAdd;
