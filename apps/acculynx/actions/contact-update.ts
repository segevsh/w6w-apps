import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient, asOptionalJson, compact, encodeId, toIdList } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  contactId: string;
  lastName: string;
  contactTypeIds: unknown;
  firstName?: string;
  companyName?: string;
  companyJobTitle?: string;
  crossReference?: string;
  mailingAddress?: unknown;
  billingAddress?: unknown;
  billingAddressSameAsMailingAddress?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description:
    "Update a contact. AccuLynx requires lastName and contactTypeIds on every update, so send them even if unchanged. Phone numbers, emails and notes are not changed by this endpoint.",
  idempotent: true,
  params: [
    idParam("contactId", "Contact id"),
    { key: "lastName", label: "Last name", type: "string", required: true },
    {
      key: "contactTypeIds",
      label: "Contact type ids",
      type: "json",
      required: true,
      hint: "Array of contact type ids; a comma-separated string also works.",
    },
    { key: "firstName", label: "First name", type: "string" },
    { key: "companyName", label: "Company name", type: "string" },
    { key: "companyJobTitle", label: "Company job title", type: "string", advanced: true },
    { key: "crossReference", label: "Cross reference", type: "string", advanced: true },
    {
      key: "mailingAddress",
      label: "Mailing address",
      type: "json",
      advanced: true,
      hint: '{"street1","street2","city","zipCode","state":{"id":<n>},"country":{"id":<n>}}',
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
  output: [{
    key: "success",
    type: "boolean",
    label: "True when AccuLynx accepted the request (it answers with no body)",
  }],

  async execute(input, ctx) {
    const { contactId, contactTypeIds, mailingAddress, billingAddress, ...rest } = input;
    const typeIds = toIdList(contactTypeIds, "contactTypeIds");
    if (typeIds.length === 0) throw new Error("contactTypeIds is required by AccuLynx on update");
    const body = {
      ...compact(rest as Record<string, unknown>),
      contactTypeIds: typeIds,
      ...compact({
        mailingAddress: asOptionalJson(mailingAddress, "mailingAddress"),
        billingAddress: asOptionalJson(billingAddress, "billingAddress"),
      }),
    };
    return await new AccuLynxClient(ctx).send(`/contacts/${encodeId(contactId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default action;
