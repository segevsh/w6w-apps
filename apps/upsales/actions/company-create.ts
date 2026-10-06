import type { ActionDefinition } from "@w6w/types";
import { buildBody, refs, UpsalesClient } from "../lib/client.ts";
import { fieldsParam } from "../lib/params.ts";

/**
 * `POST /api/v2/accounts` — Create a company.
 */
interface Input {
  name: string;
  phone?: string;
  fax?: string;
  webpage?: string;
  notes?: string;
  userIds?: string;
  fields?: unknown;
}

const companyCreate: ActionDefinition<Input> = {
  key: "company-create",
  type: "perform",
  resource: "company",
  title: "Create Company",
  description: "Create a company.",
  idempotent: false,
  params: [
    {
      "key": "name",
      "label": "Name",
      "type": "string",
      "required": true,
    },
    {
      "key": "phone",
      "label": "Phone",
      "type": "string",
    },
    {
      "key": "fax",
      "label": "Fax",
      "type": "string",
    },
    {
      "key": "webpage",
      "label": "Web page",
      "type": "string",
    },
    {
      "key": "notes",
      "label": "Notes",
      "type": "text",
    },
    {
      "key": "userIds",
      "label": "Account manager user IDs",
      "type": "string",
      "hint": "Comma-separated Upsales user IDs, e.g. `1,2`.",
    },
    fieldsParam,
  ],
  output: [{ key: "data", type: "object", label: "The created company" }],

  async execute(input, ctx) {
    const body = buildBody(input.fields, {
      name: input.name,
      phone: input.phone,
      fax: input.fax,
      webpage: input.webpage,
      notes: input.notes,
      users: refs(input.userIds),
    });
    const data = await new UpsalesClient(ctx).data("POST", "/accounts", { body });
    return { data };
  },
};

export default companyCreate;
