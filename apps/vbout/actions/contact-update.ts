import type { ActionDefinition } from "@w6w/types";
import { toObject, VboutClient } from "../lib/client.ts";

/**
 * `POST /1/emailmarketing/editcontact.json` — Update a contact by ID.
 */
interface Input {
  id: string;
  email?: string;
  ipAddress?: string;
  status?: string;
  fields?: Record<string, unknown> | string;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update a contact by ID.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Contact ID",
      type: "string",
      required: true,
    },
    {
      key: "email",
      label: "Email",
      type: "string",
    },
    {
      key: "ipAddress",
      label: "IP Address",
      type: "string",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      hint: "Whether the contact receives email.",
      options: [{ value: "active", label: "Active" }, { value: "disactive", label: "Disactive" }],
    },
    {
      key: "fields",
      label: "Custom Fields",
      type: "json",
      hint:
        'Object mapping a list\'s custom-field ID to its value, e.g. {"125": "John", "1204": "Doe"}. Dates accept Y-m-d, d-m-Y or m/d/Y.',
    },
  ],
  output: [
    {
      key: "ok",
      type: "boolean",
      label:
        "True when VBOUT accepted the request. Any fields VBOUT returns for the record (e.g. a created record's details) are merged in.",
    },
  ],

  async execute(input, ctx) {
    return await new VboutClient(ctx).post("emailmarketing/editcontact", {
      id: input.id,
      email: input.email,
      ipaddress: input.ipAddress,
      status: input.status,
      fields: toObject(input.fields, "fields"),
    });
  },
};

export default contactUpdate;
