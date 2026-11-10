import type { ActionDefinition } from "@w6w/types";
import { RedtailClient, type RedtailMeta } from "../lib/client.ts";
import { pageParams } from "../lib/params.ts";
import type { RedtailAddress } from "../lib/types.ts";

interface Input {
  contactId: number;
  page?: number;
}

interface Output {
  addresses: RedtailAddress[];
  meta?: RedtailMeta;
}

const contactAddressList: ActionDefinition<Input, Output> = {
  key: "contact-address-list",
  type: "read",
  resource: "contact-address",
  title: "List Contact Addresses",
  description: "List a contact's addresses.",
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
    ...pageParams,
  ],
  output: [{ key: "addresses", type: "array", label: "Addresses" }],

  async execute(input, ctx) {
    const res = await new RedtailClient(ctx).request<Output>(
      `/contacts/${input.contactId}/addresses`,
      { query: { page: input.page } },
    );
    return { addresses: res.data.addresses ?? [], ...(res.meta ? { meta: res.meta } : {}) };
  },
};

export default contactAddressList;
