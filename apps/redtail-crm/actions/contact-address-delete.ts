import type { ActionDefinition } from "@w6w/types";
import { RedtailClient } from "../lib/client.ts";

interface Input {
  contactId: number;
  addressId: number;
}

interface Output {
  deleted: boolean;
}

const contactAddressDelete: ActionDefinition<Input, Output> = {
  key: "contact-address-delete",
  type: "perform",
  resource: "contact-address",
  title: "Delete Contact Address",
  description: "Delete a contact's address. Redtail answers 204 No Content on success.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
    { key: "addressId", label: "Address ID", type: "number", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new RedtailClient(ctx).request(
      `/contacts/${input.contactId}/addresses/${input.addressId}`,
      { method: "DELETE" },
    );
    return { deleted: true };
  },
};

export default contactAddressDelete;
