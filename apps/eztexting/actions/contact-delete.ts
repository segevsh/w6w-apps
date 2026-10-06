import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, EzTextingClient } from "../lib/client.ts";
import { phoneNumberParam, statusOutput } from "../lib/params.ts";

/** `DELETE /v1/contacts/{phoneNumber}` — delete a contact by phone number. */
interface Input {
  phoneNumber: string;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete one contact by phone number.",
  idempotent: true,
  params: [phoneNumberParam],
  output: [{ key: "phoneNumber", type: "string", label: "Contact deleted" }, ...statusOutput],

  async execute(input, ctx) {
    const status = await new EzTextingClient(ctx).status(
      `/contacts/${encodePathSegment(input.phoneNumber)}`,
      { method: "DELETE" },
    );
    return { phoneNumber: input.phoneNumber, status };
  },
};

export default contactDelete;
