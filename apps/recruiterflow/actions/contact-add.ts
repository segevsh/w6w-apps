import type { ActionDefinition } from "@w6w/types";
import { asObject, asOptionalJson, call, compact } from "../lib/client.ts";

interface Input {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  clientCompany?: unknown;
  fields?: unknown;
}

const contactAdd: ActionDefinition<Input> = {
  key: "contact-add",
  type: "perform",
  title: "Add Contact",
  description: "Create a contact at a client company.",
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string", required: true },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "email", label: "Primary email", type: "string" },
    { key: "clientCompany", label: "Client company", type: "string", hint: "Company name." },
    {
      key: "fields",
      label: "Additional fields",
      type: "json",
      hint:
        "JSON object of any other contact fields from the API reference (profile links, education, experience, tags, custom_fields...). Merged into the request body; the named params above win.",
    },
  ],
  output: [{ key: "RESULT", type: "string", label: "Result" }, {
    key: "data",
    type: "object",
    label: "Response data",
  }],

  async execute(input, ctx) {
    const body = {
      ...asOptionalJson<Record<string, unknown>>(input.fields, "Additional fields"),
      ...compact({
        "first_name": input.firstName,
        "last_name": input.lastName,
        "email": input.email ? [{ email: input.email, is_primary: 1 }] : undefined,
        "client_company": input.clientCompany,
      }),
    };
    const res = await call(ctx, "/contact/add", { method: "POST", body });
    return asObject(res);
  },
};

export default contactAdd;
