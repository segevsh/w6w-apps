import type { ActionDefinition } from "@w6w/types";
import { bit, buildBody, encodeId, ref, UpsalesClient } from "../lib/client.ts";
import { fieldsParam, idParam } from "../lib/params.ts";

/**
 * `PUT /api/v2/contacts/{id}` — Update a contact.
 *
 * Create sends `usingFirstnameLastname=true`, as the vendor's own example does, so
 * `firstName`/`lastName` are accepted. The vendor's update example sends the combined `name`.
 */
interface Input {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  cellPhone?: string;
  title?: string;
  active?: boolean;
  clientId?: number;
  fields?: unknown;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update a contact.",
  idempotent: true,
  params: [
    idParam("id", "Contact ID"),
    {
      "key": "name",
      "label": "Full name",
      "type": "string",
    },
    {
      "key": "email",
      "label": "Email",
      "type": "string",
    },
    {
      "key": "phone",
      "label": "Phone",
      "type": "string",
    },
    {
      "key": "cellPhone",
      "label": "Mobile phone",
      "type": "string",
    },
    {
      "key": "title",
      "label": "Job title",
      "type": "string",
    },
    {
      "key": "active",
      "label": "Active",
      "type": "boolean",
    },
    {
      "key": "clientId",
      "label": "Company ID",
      "type": "number",
    },
    fieldsParam,
  ],
  output: [{ key: "data", type: "object", label: "The updated contact" }],

  async execute(input, ctx) {
    const body = buildBody(input.fields, {
      name: input.name,
      email: input.email,
      phone: input.phone,
      cellPhone: input.cellPhone,
      title: input.title,
      active: bit(input.active),
      client: ref(input.clientId),
    });
    if (Object.keys(body).filter((k) => !([] as string[]).includes(k)).length === 0) {
      throw new Error("Nothing to update: provide at least one field.");
    }
    const data = await new UpsalesClient(ctx).data("PUT", `/contacts/${encodeId(input.id)}`, {
      body,
    });
    return { data };
  },
};

export default contactUpdate;
