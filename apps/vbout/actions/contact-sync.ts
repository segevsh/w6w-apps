import type { ActionDefinition } from "@w6w/types";
import { toObject, VboutClient } from "../lib/client.ts";

/**
 * `POST /1/emailmarketing/synccontact.json` — Create or update a contact, matched by email address.
 */
interface Input {
  email: string;
  listId?: string;
  ipAddress?: string;
  status?: string;
  fields?: Record<string, unknown> | string;
}

const contactSync: ActionDefinition<Input> = {
  key: "contact-sync",
  type: "perform",
  resource: "contact",
  title: "Sync Contact",
  description: "Create or update a contact, matched by email address.",
  idempotent: true,
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
    },
    {
      key: "listId",
      label: "List ID",
      type: "string",
      hint: "The list to assign the contact to.",
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
    return await new VboutClient(ctx).post("emailmarketing/synccontact", {
      email: input.email,
      listid: input.listId,
      ipaddress: input.ipAddress,
      status: input.status,
      fields: toObject(input.fields, "fields"),
    });
  },
};

export default contactSync;
