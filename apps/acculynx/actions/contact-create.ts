import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient, asOptionalJson, compact, toIdList } from "../lib/client.ts";

interface Input {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  companyJobTitle?: string;
  crossReference?: string;
  note?: string;
  contactTypeIds?: unknown;
  phoneNumbers?: unknown;
  emailAddresses?: unknown;
  mailingAddress?: unknown;
  billingAddress?: unknown;
  billingAddressSameAsMailingAddress?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    "Create a contact. Phone numbers and email addresses are arrays exactly as AccuLynx documents them.",
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "companyName", label: "Company name", type: "string" },
    { key: "companyJobTitle", label: "Company job title", type: "string", advanced: true },
    {
      key: "crossReference",
      label: "Cross reference",
      type: "string",
      advanced: true,
      hint: "Your own id for this contact in another system.",
    },
    { key: "note", label: "Note", type: "text", advanced: true },
    {
      key: "contactTypeIds",
      label: "Contact type ids",
      type: "json",
      advanced: true,
      hint: "Array of contact type ids; a comma-separated string also works.",
    },
    {
      key: "phoneNumbers",
      label: "Phone numbers",
      type: "json",
      hint:
        'Array like [{"number":"3135550100","type":"Mobile","primary":true}]. type is Home, Mobile or Work.',
    },
    {
      key: "emailAddresses",
      label: "Email addresses",
      type: "json",
      hint:
        'Array like [{"address":"a@b.com","type":"Work","primary":true}]. type is Personal, Work or Other.',
    },
    {
      key: "mailingAddress",
      label: "Mailing address",
      type: "json",
      advanced: true,
      hint:
        '{"street1","street2","city","zipCode","state":{"id":<n>},"country":{"id":<n>}}. Ids come from List Countries and List States.',
    },
    {
      key: "billingAddress",
      label: "Billing address",
      type: "json",
      advanced: true,
      hint: "Same shape as the mailing address.",
    },
    {
      key: "billingAddressSameAsMailingAddress",
      label: "Billing same as mailing",
      type: "boolean",
      advanced: true,
    },
  ],
  output: [{ key: "id", type: "string", label: "New contact id" }, {
    key: "_link",
    type: "string",
    label: "Link to fetch the contact",
  }],

  async execute(input, ctx) {
    const {
      contactTypeIds,
      phoneNumbers,
      emailAddresses,
      mailingAddress,
      billingAddress,
      ...rest
    } = input;
    const typeIds = toIdList(contactTypeIds, "contactTypeIds");
    const body = {
      ...compact(rest as Record<string, unknown>),
      ...(typeIds.length > 0 ? { contactTypeIds: typeIds } : {}),
      ...compact({
        phoneNumbers: asOptionalJson(phoneNumbers, "phoneNumbers"),
        emailAddresses: asOptionalJson(emailAddresses, "emailAddresses"),
        mailingAddress: asOptionalJson(mailingAddress, "mailingAddress"),
        billingAddress: asOptionalJson(billingAddress, "billingAddress"),
      }),
    };
    return await new AccuLynxClient(ctx).send("/contacts", { method: "POST", body });
  },
};

export default action;
