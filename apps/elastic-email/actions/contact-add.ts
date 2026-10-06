import type { ActionDefinition } from "@w6w/types";
import { compact, ElasticClient, toList } from "../lib/client.ts";

type Input = Record<string, unknown>;

export const STATUSES = [
  "Transactional",
  "Engaged",
  "Active",
  "Bounced",
  "Unsubscribed",
  "Abuse",
  "Inactive",
  "Stale",
  "NotConfirmed",
];

/** `POST /v4/contacts` — the body is an ARRAY (up to 1000); this action sends one. */
const contactAdd: ActionDefinition<Input> = {
  key: "contact-add",
  type: "perform",
  resource: "contact",
  title: "Add Contact",
  description:
    "Add a contact, optionally into one or more lists. Elastic Email's endpoint takes an " +
    "array and answers the stored contacts; this sends one and returns it.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: STATUSES.map((s) => ({ value: s, label: s })),
      hint: "Vendor default is Transactional.",
    },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      hint: 'Object of string values, e.g. {"city": "New York"}.',
    },
    {
      key: "listNames",
      label: "Add to lists",
      type: "string",
      hint: "Comma-separated list names the contact is added to.",
    },
    { key: "consentIp", label: "Consent IP", type: "string", hint: "Defaults to your public IP." },
  ],
  output: [{ key: "contacts", type: "array", label: "Stored contacts" }],
  async execute(input, ctx) {
    const email = String(input.email ?? "").trim();
    if (!email) throw new Error("Email is required");
    const consent = compact({ ConsentIP: input.consentIp });
    const contact = compact({
      Email: email,
      FirstName: input.firstName,
      LastName: input.lastName,
      Status: input.status,
      CustomFields: input.customFields,
      Consent: Object.keys(consent).length ? consent : undefined,
    });
    const out = await new ElasticClient(ctx).json<unknown[]>("/contacts", {
      method: "POST",
      query: { listnames: toList(input.listNames as string | undefined) },
      body: [contact],
    });
    return { contacts: Array.isArray(out) ? out : [] };
  },
};

export default contactAdd;
