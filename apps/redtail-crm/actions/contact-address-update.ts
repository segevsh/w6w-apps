import type { ActionDefinition } from "@w6w/types";
import { compact, RedtailClient } from "../lib/client.ts";
import type { RedtailAddressInput } from "../lib/types.ts";

interface Input {
  contactId: number;
  addressId: number;
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
  updated: boolean;
}

const contactAddressUpdate: ActionDefinition<Input, Output> = {
  key: "contact-address-update",
  type: "perform",
  resource: "contact-address",
  title: "Update Contact Address",
  description: "Update a contact's address. Redtail answers 204 No Content on success.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
    { key: "addressId", label: "Address ID", type: "number", required: true },
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
  output: [{ key: "updated", type: "boolean", label: "Updated" }],

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
    await new RedtailClient(ctx).request(
      `/contacts/${input.contactId}/addresses/${input.addressId}`,
      { method: "PUT", body },
    );
    return { updated: true };
  },
};

export default contactAddressUpdate;
