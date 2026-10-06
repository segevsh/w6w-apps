import type { ActionDefinition } from "@w6w/types";
import { SimpleroClient } from "../lib/client.ts";
import {
  contactBody,
  contactFieldParams,
  type ContactFields,
  contactIdParam,
} from "../lib/params.ts";

interface Input extends ContactFields {
  id: number;
  email?: string;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description:
    "Update a contact's profile fields. Only the fields you set are sent, so the others are " +
    "left as they are.",
  idempotent: true,
  params: [
    contactIdParam,
    { key: "email", label: "Email", type: "string" },
    ...contactFieldParams,
  ],
  output: [{ key: "record", type: "object", label: "The updated contact" }],

  async execute(input, ctx) {
    const body = contactBody(input);
    if (Object.keys(body).length === 0) {
      throw new Error("Simplero contact-update: set at least one field to change");
    }
    const record = await new SimpleroClient(ctx).write("PATCH", `/customers/${input.id}`, body);
    return { record };
  },
};

export default contactUpdate;
