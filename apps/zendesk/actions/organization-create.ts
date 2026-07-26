import type { ActionDefinition } from "@w6w/types";
import { csv, unset, ZendeskClient } from "../lib/client.ts";

interface Input {
  name: string;
  domainNames?: string;
  details?: string;
  notes?: string;
  tags?: string;
  externalId?: string;
}

const organizationCreate: ActionDefinition<Input> = {
  key: "organization-create",
  type: "perform",
  resource: "organization",
  title: "Create Organization",
  description: "Create an organization. Users with a matching email domain join it automatically.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "domainNames",
      label: "Domains",
      type: "string",
      hint: "Comma-separated. New users with these email domains are added automatically.",
    },
    { key: "details", label: "Details", type: "text", config: { multiline: true } },
    { key: "notes", label: "Notes", type: "text", config: { multiline: true } },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated." },
    { key: "externalId", label: "External ID", type: "string", advanced: true },
  ],
  output: [
    { key: "organization.id", type: "number", label: "Organization ID" },
    { key: "organization.name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new ZendeskClient(ctx).request("/organizations.json", {
      method: "POST",
      body: {
        organization: {
          name: input.name,
          domain_names: csv(input.domainNames),
          details: unset(input.details),
          notes: unset(input.notes),
          tags: csv(input.tags),
          external_id: unset(input.externalId),
        },
      },
    });
  },
};

export default organizationCreate;
