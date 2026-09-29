import type { ActionDefinition } from "@w6w/types";
import { compact, KvCoreClient, type KvCoreListPage } from "../lib/client.ts";
import { contactStatusOptions, leadTypeOptions, paginationParams } from "../lib/params.ts";

interface Input {
  email?: string;
  first_name?: string;
  last_name?: string;
  updated_at?: number;
  source?: string;
  system_source?: string;
  leadtype?: string[];
  registered_after?: number;
  registered_before?: number;
  status?: string;
  assigned_agent_id?: number;
  hashtags?: string[];
  includeArchived?: boolean;
  page?: number;
  limit?: number;
}

interface Contact {
  id: number;
  email?: string;
  name?: string;
  status?: number;
  [key: string]: unknown;
}

/**
 * `GET /v2/public/contacts` — search contacts by profile, system, agent or
 * tag filters. Every `filter[...]` name below is copied verbatim from the
 * vendor's OpenAPI parameter list; string filters match with vendor-side
 * trailing wildcards ("exactly, or LIKE with a trailing wildcard"), not a
 * client-side substring search.
 */
const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "Search contacts. Combine filters to narrow the result — see the field hints below.",
  params: [
    { key: "email", label: "Email", type: "string", hint: "Exact match, or a leading substring." },
    { key: "first_name", label: "First name", type: "string" },
    { key: "last_name", label: "Last name", type: "string" },
    {
      key: "updated_at",
      label: "Updated at or after",
      type: "number",
      hint: "Unix timestamp. Returns contacts updated at or after this time.",
    },
    { key: "source", label: "Source", type: "string" },
    { key: "system_source", label: "System source", type: "string", hint: 'e.g. "API".' },
    {
      key: "leadtype",
      label: "Lead type",
      type: "multiselect",
      options: leadTypeOptions,
    },
    {
      key: "registered_after",
      label: "Registered after",
      type: "number",
      hint: "Unix timestamp.",
    },
    {
      key: "registered_before",
      label: "Registered before",
      type: "number",
      hint: "Unix timestamp.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: contactStatusOptions.map((o) => ({ value: String(o.value), label: o.label })),
    },
    { key: "assigned_agent_id", label: "Assigned agent ID", type: "number" },
    { key: "hashtags", label: "Hashtags", type: "multiselect", hint: "Without the leading #." },
    {
      key: "includeArchived",
      label: "Include archived",
      type: "boolean",
      default: false,
    },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Contacts" },
    { key: "total", type: "number", label: "Total matching contacts" },
    { key: "current_page", type: "number", label: "Current page" },
    { key: "last_page", type: "number", label: "Last page" },
  ],

  async execute(input, ctx) {
    return await new KvCoreClient(ctx).json<KvCoreListPage<Contact>>("/contacts", {
      query: compact({
        "filter[email]": input.email,
        "filter[first_name]": input.first_name,
        "filter[last_name]": input.last_name,
        "filter[updated_at]": input.updated_at,
        "filter[source][]": input.source,
        "filter[system_source][]": input.system_source,
        "filter[leadtype][]": input.leadtype,
        "filter[registered_after]": input.registered_after,
        "filter[registered_before]": input.registered_before,
        "filter[status][]": input.status,
        "filter[assigned_agent_id]": input.assigned_agent_id,
        "filter[hashtags][]": input.hashtags,
        includeArchived: input.includeArchived ? 1 : undefined,
        page: input.page,
        limit: input.limit,
      }),
    });
  },
};

export default contactList;
