import type { ActionDefinition } from "@w6w/types";
import { CONTACT_REF_PARAMS, contactRef, RefinerClient } from "../lib/client.ts";

interface Input {
  id?: string;
  email?: string;
  uuid?: string;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description:
    "Delete a contact AND all of its survey responses. To erase personal data but keep the " +
    "responses, overwrite the traits with empty values using Identify User instead.",
  idempotent: true,
  params: CONTACT_REF_PARAMS,
  output: [{ key: "message", type: "string", label: "Vendor confirmation" }],

  async execute(input, ctx) {
    return await new RefinerClient(ctx).json("/contact", {
      method: "DELETE",
      query: contactRef(input),
    });
  },
};

export default contactDelete;
