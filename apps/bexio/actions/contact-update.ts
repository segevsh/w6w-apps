import type { ActionDefinition } from "@w6w/types";
import { BexioClient } from "../lib/client.ts";

interface Input {
  contactId: number;
  contactTypeId: number;
  name1: string;
  name2?: string;
  userId: number;
  ownerId: number;
  mail?: string;
  phoneFixed?: string;
  phoneMobile?: string;
  streetName?: string;
  houseNumber?: string;
  postcode?: string;
  city?: string;
  countryId?: number;
  remarks?: string;
}

/**
 * bexio has no PUT/PATCH: editing a contact is `POST /2.0/contact/{id}`, and
 * the request schema is IDENTICAL to create's (`ContactWithDetails`) — every
 * field that isn't sent is treated as unset, not "leave unchanged". This
 * action therefore still requires the same fields create does, not just the
 * ones being changed.
 */
const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description:
    "Replace a contact's fields. bexio's edit endpoint takes the full contact payload, not a " +
    "partial patch — any field left blank here is sent as unset.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
    {
      key: "contactTypeId",
      label: "Contact type",
      type: "select",
      required: true,
      options: [
        { value: 1, label: "Company" },
        { value: 2, label: "Person" },
      ],
    },
    { key: "name1", label: "Name", type: "string", required: true },
    { key: "name2", label: "Name addition", type: "string" },
    { key: "userId", label: "Owning user ID", type: "number", required: true },
    { key: "ownerId", label: "Owner (person responsible) user ID", type: "number", required: true },
    { key: "mail", label: "Email", type: "string" },
    { key: "phoneFixed", label: "Phone (fixed)", type: "string" },
    { key: "phoneMobile", label: "Phone (mobile)", type: "string" },
    { key: "streetName", label: "Street", type: "string" },
    { key: "houseNumber", label: "House number", type: "string" },
    { key: "postcode", label: "Postcode", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "countryId", label: "Country ID", type: "number" },
    { key: "remarks", label: "Remarks", type: "text" },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
  ],

  execute(input, ctx) {
    return new BexioClient(ctx).post(`/2.0/contact/${encodeURIComponent(input.contactId)}`, {
      contact_type_id: input.contactTypeId,
      name_1: input.name1,
      name_2: input.name2,
      user_id: input.userId,
      owner_id: input.ownerId,
      mail: input.mail,
      phone_fixed: input.phoneFixed,
      phone_mobile: input.phoneMobile,
      street_name: input.streetName,
      house_number: input.houseNumber,
      postcode: input.postcode,
      city: input.city,
      country_id: input.countryId,
      remarks: input.remarks,
    });
  },
};

export default contactUpdate;
