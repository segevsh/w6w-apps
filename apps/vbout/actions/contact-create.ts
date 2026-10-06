import type { ActionDefinition } from "@w6w/types";
import { toObject, VboutClient } from "../lib/client.ts";

/**
 * `POST /1/emailmarketing/addcontact.json` — Add a contact to a list.
 */
interface Input {
  listId: string;
  status: string;
  email?: string;
  ipAddress?: string;
  fields?: Record<string, unknown> | string;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Add a contact to a list.",
  idempotent: false,
  params: [
    {
      key: "listId",
      label: "List ID",
      type: "string",
      required: true,
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      hint: "Whether the contact receives email.",
      options: [{ value: "active", label: "Active" }, { value: "disactive", label: "Disactive" }],
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
    return await new VboutClient(ctx).post("emailmarketing/addcontact", {
      listid: input.listId,
      status: input.status,
      email: input.email,
      ipaddress: input.ipAddress,
      fields: toObject(input.fields, "fields"),
    });
  },
};

export default contactCreate;
