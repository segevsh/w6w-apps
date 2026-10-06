import type { ActionDefinition } from "@w6w/types";
import { buildBody, encodeId, refs, UpsalesClient } from "../lib/client.ts";
import { fieldsParam, idParam } from "../lib/params.ts";

/**
 * `PUT /api/v2/accounts/{id}` — Update a company.
 */
interface Input {
  id: number;
  name?: string;
  phone?: string;
  fax?: string;
  webpage?: string;
  notes?: string;
  userIds?: string;
  fields?: unknown;
}

const companyUpdate: ActionDefinition<Input> = {
  key: "company-update",
  type: "perform",
  resource: "company",
  title: "Update Company",
  description: "Update a company.",
  idempotent: true,
  params: [
    idParam("id", "Company ID"),
    {
      "key": "name",
      "label": "Name",
      "type": "string",
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
  output: [{ key: "data", type: "object", label: "The updated company" }],

  async execute(input, ctx) {
    const body = buildBody(input.fields, {
      name: input.name,
      phone: input.phone,
      fax: input.fax,
      webpage: input.webpage,
      notes: input.notes,
      users: refs(input.userIds),
    });
    if (Object.keys(body).filter((k) => !([] as string[]).includes(k)).length === 0) {
      throw new Error("Nothing to update: provide at least one field.");
    }
    const data = await new UpsalesClient(ctx).data("PUT", `/accounts/${encodeId(input.id)}`, {
      body,
    });
    return { data };
  },
};

export default companyUpdate;
