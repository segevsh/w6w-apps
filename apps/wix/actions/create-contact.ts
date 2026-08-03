import type { ActionDefinition } from "@w6w/types";
import { compact, WixClient } from "../lib/client.ts";

interface Input {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  labelKeys?: string;
  info?: Record<string, unknown>;
  allowDuplicates?: boolean;
}

/** `POST /contacts/v4/contacts` — handler `wix.contacts.v4.contact:CreateContact`. */
const createContact: ActionDefinition<Input> = {
  key: "create-contact",
  type: "perform",
  resource: "contact",
  /**
   * Not idempotent — but less unsafe than it looks. Wix rejects a create whose
   * email or phone already exists unless `allowDuplicates` is set, so a plain
   * retry usually fails rather than making a second contact. It is declared
   * `false` because that protection is Wix's default rather than a guarantee,
   * and it disappears entirely the moment `allowDuplicates` is turned on.
   */
  idempotent: false,
  title: "Create Contact",
  description:
    "Create a contact. Wix requires at least one of name, email or phone, and rejects a duplicate email or phone unless you allow duplicates.",
  params: [
    {
      key: "info",
      label: "Full contact info",
      type: "json",
      hint:
        "The complete Wix `info` object. When set it is used verbatim and the individual fields below are ignored — use it for addresses, extended fields or multiple emails.",
    },
    {
      key: "firstName",
      label: "First name",
      type: "string",
      showIf: { "!": { var: "info" } },
    },
    {
      key: "lastName",
      label: "Last name",
      type: "string",
      showIf: { "!": { var: "info" } },
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Stored as the contact's primary email.",
      showIf: { "!": { var: "info" } },
    },
    {
      key: "phone",
      label: "Phone",
      type: "string",
      hint: "Stored as the contact's primary phone.",
      showIf: { "!": { var: "info" } },
    },
    { key: "company", label: "Company", type: "string", showIf: { "!": { var: "info" } } },
    { key: "jobTitle", label: "Job title", type: "string", showIf: { "!": { var: "info" } } },
    {
      key: "labelKeys",
      label: "Labels",
      type: "string",
      hint:
        "Comma-separated label keys, e.g. `custom.vip`. The label must already exist — create it with Find or Create Label first.",
      showIf: { "!": { var: "info" } },
    },
    {
      key: "allowDuplicates",
      label: "Allow duplicates",
      type: "boolean",
      hint:
        "By default Wix fails the call when the email or phone already belongs to another contact. Turning this on removes that safeguard.",
    },
  ],
  output: [{ key: "contact", type: "object", label: "Created contact" }],

  execute(input, ctx) {
    const labelKeys = input.labelKeys
      ? input.labelKeys.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const info = input.info ?? compact({
      name: (input.firstName || input.lastName)
        ? compact({ first: input.firstName, last: input.lastName })
        : undefined,
      emails: input.email ? { items: [{ email: input.email, primary: true }] } : undefined,
      phones: input.phone ? { items: [{ phone: input.phone, primary: true }] } : undefined,
      company: input.company,
      jobTitle: input.jobTitle,
      labelKeys: labelKeys ? { items: labelKeys } : undefined,
    });

    return new WixClient(ctx).request("/contacts/v4/contacts", {
      method: "POST",
      body: compact({ info, allowDuplicates: input.allowDuplicates }),
    });
  },
};

export default createContact;
