import type { ActionDefinition } from "@w6w/types";
import { BexioClient } from "../lib/client.ts";

interface Input {
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
  languageId?: number;
  isLead?: boolean;
  remarks?: string;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a company or person contact.",
  idempotent: false,
  params: [
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
    {
      key: "name1",
      label: "Name",
      type: "string",
      required: true,
      hint: "Company name (type Company) or last name (type Person).",
    },
    {
      key: "name2",
      label: "Name addition",
      type: "string",
      hint: "Company name addition (type Company) or first name (type Person).",
    },
    { key: "userId", label: "Owning user ID", type: "number", required: true },
    { key: "ownerId", label: "Owner (person responsible) user ID", type: "number", required: true },
    { key: "mail", label: "Email", type: "string" },
    { key: "phoneFixed", label: "Phone (fixed)", type: "string" },
    { key: "phoneMobile", label: "Phone (mobile)", type: "string" },
    { key: "streetName", label: "Street", type: "string" },
    { key: "houseNumber", label: "House number", type: "string" },
    { key: "postcode", label: "Postcode", type: "string" },
    { key: "city", label: "City", type: "string" },
    {
      key: "countryId",
      label: "Country ID",
      type: "number",
      hint: "References a bexio country object.",
    },
    { key: "languageId", label: "Language ID", type: "number" },
    { key: "isLead", label: "Is lead", type: "boolean", default: false },
    { key: "remarks", label: "Remarks", type: "text" },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "nr", type: "string", label: "Contact number" },
  ],

  execute(input, ctx) {
    return new BexioClient(ctx).post("/2.0/contact", {
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
      language_id: input.languageId,
      is_lead: input.isLead,
      remarks: input.remarks,
    });
  },
};

export default contactCreate;
