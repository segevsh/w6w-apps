import type { ActionDefinition } from "@w6w/types";
import { RedtailClient } from "../lib/client.ts";
import type { RedtailAddress } from "../lib/types.ts";

interface Input {
  contactId: number;
}

interface Output {
  addresses: RedtailAddress[];
}

const contactAddressList: ActionDefinition<Input, Output> = {
  key: "contact-address-list",
  type: "read",
  resource: "contact-address",
  title: "List Contact Addresses",
  description: "List a contact's addresses.",
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
  ],
  output: [{ key: "addresses", type: "array", label: "Addresses" }],

  async execute(input, ctx) {
    const res = await new RedtailClient(ctx).request<Output>(
      `/contacts/${input.contactId}/addresses`,
    );
    return { addresses: res.data.addresses ?? [] };
  },
};

export default contactAddressList;
