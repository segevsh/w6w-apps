import type { ActionDefinition } from "@w6w/types";
import { compact, RedtailClient } from "../lib/client.ts";
import type { RedtailAddressInput } from "../lib/types.ts";

interface Input {
  contactId: number;
  streetAddress?: string;
  secondaryAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  addressType?: number;
  isPrimary?: boolean;
  isPreferred?: boolean;
}

interface Output {
  success: boolean;
  id: number;
}

const contactAddressCreate: ActionDefinition<Input, Output> = {
  key: "contact-address-create",
  type: "perform",
  resource: "contact-address",
  title: "Create Contact Address",
  description: "Add an address to a contact.",
  idempotent: false,
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
    { key: "streetAddress", label: "Street address", type: "string" },
    { key: "secondaryAddress", label: "Secondary address", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State", type: "string" },
    { key: "zip", label: "Zip", type: "string" },
    { key: "country", label: "Country", type: "string" },
    {
      key: "addressType",
      label: "Address type",
      type: "number",
      hint: "The docs' own examples use 1 for Home and 2 for Work.",
    },
    { key: "isPrimary", label: "Primary address", type: "boolean" },
    { key: "isPreferred", label: "Preferred address", type: "boolean" },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "id", type: "number", label: "New address ID" },
  ],

  async execute(input, ctx) {
    const body: RedtailAddressInput = compact({
      street_address: input.streetAddress,
      secondary_address: input.secondaryAddress,
      city: input.city,
      state: input.state,
      zip: input.zip,
      country: input.country,
      address_type: input.addressType,
      is_primary: input.isPrimary,
      is_preferred: input.isPreferred,
    });
    const res = await new RedtailClient(ctx).request<Output>(
      `/contacts/${input.contactId}/addresses`,
      { method: "POST", body },
    );
    return res.data;
  },
};

export default contactAddressCreate;
