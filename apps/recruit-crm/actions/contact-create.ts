import type { ActionDefinition } from "@w6w/types";
import { RecruitClient } from "../lib/client.ts";
import { contactFields } from "../lib/fields.ts";
import { fieldBody, fieldParams } from "../lib/params.ts";

const contactCreate: ActionDefinition<Record<string, unknown>> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a contact (`POST /v1/contacts`, JSON body).",
  idempotent: false,
  params: fieldParams(contactFields),
  output: [
    { key: "first_name", type: "string", label: "First name" },
    { key: "slug", type: "string", label: "Id (slug)" },
  ],

  execute(input, ctx) {
    const body = fieldBody(contactFields, input);
    if (Object.keys(body).length === 0) throw new Error("at least one contact field is required");
    return new RecruitClient(ctx).json("/contacts", { method: "POST", body });
  },
};

export default contactCreate;
