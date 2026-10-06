import type { ActionDefinition } from "@w6w/types";
import { encodeId, RecruitClient } from "../lib/client.ts";
import { slugParam } from "../lib/params.ts";

interface Input {
  contactId: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch one contact by id (`GET /v1/contacts/{id}`).",
  params: [slugParam("contactId", "Contact id", "contact")],
  output: [{ key: "first_name", type: "string", label: "First name" }, {
    key: "last_name",
    type: "string",
    label: "Last name",
  }, { key: "email", type: "string", label: "Email" }],

  execute(input, ctx) {
    return new RecruitClient(ctx).json(`/contacts/${encodeId(input.contactId)}`);
  },
};

export default contactGet;
