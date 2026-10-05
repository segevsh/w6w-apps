import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, HoneyBookClient, nonEmpty, toList } from "../lib/client.ts";
import { contactIncludeParams } from "../lib/params.ts";

interface Input {
  contactId: string;
  type?: string;
  contextType?: string;
  interactionDate?: string;
  include?: string[] | string;
  maxActionSuggestions?: number;
  maxWorkspaces?: number;
  maxTags?: number;
  maxCustomFields?: number;
}

const contactInteractionSet: ActionDefinition<Input> = {
  key: "contact-interaction-set",
  type: "perform",
  resource: "contact",
  title: "Set Contact Interaction",
  description: "Set (replace) a contact's last interaction.",
  idempotent: true,
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      required: true,
      hint: "Contact id (BSON ObjectId hex).",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { "value": "manual", "label": "Manual" },
        { "value": "email", "label": "Email" },
        { "value": "meeting", "label": "Meeting" },
        { "value": "lead_form", "label": "Lead form" },
        { "value": "contact_form", "label": "Contact form" },
      ],
    },
    {
      key: "contextType",
      label: "Context type",
      type: "select",
      options: [{ "value": "Event", "label": "Event" }, {
        "value": "CompanyContact",
        "label": "Companycontact",
      }, { "value": "ClientOrganization", "label": "Clientorganization" }],
    },
    { key: "interactionDate", label: "Interaction date", type: "datetime" },
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
      type: input.type,
      context_type: input.contextType,
      interaction_date: input.interactionDate,
      include: toList(input.include),
      max_action_suggestions: input.maxActionSuggestions,
      max_workspaces: input.maxWorkspaces,
      max_tags: input.maxTags,
      max_custom_fields: input.maxCustomFields,
    });
    const result = await new HoneyBookClient(ctx).request(
      "PUT",
      `/contacts/${encodeId(input.contactId)}/interaction`,
      {
        body: nonEmpty(body),
      },
    );
    return result;
  },
};

export default contactInteractionSet;
