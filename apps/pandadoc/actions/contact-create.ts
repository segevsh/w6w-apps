import type { ActionDefinition } from "@w6w/types";
import { compact, PandaDocClient } from "../lib/client.ts";

interface Input {
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  phone?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/**
 * `POST /public/v1/contacts` — create a contact.
 *
 * PandaDoc documents **every** field on this route as optional and nullable,
 * including `email` — so no param is marked required here, because marking one
 * required would be this app inventing a constraint the API does not impose.
 * In practice a contact without an email is of little use as a recipient.
 *
 * There is no upsert: posting the same email twice creates a second contact.
 * Pair with `contact-get-many` (exact email match) to check first.
 */
const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    "Create a contact in the workspace. PandaDoc treats every field as optional and does not deduplicate by email.",
  // No upsert and no idempotency key — a retry creates a duplicate contact.
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string" },
    { key: "firstName", label: "First name", type: "string", hint: "Sent as `first_name`." },
    { key: "lastName", label: "Last name", type: "string", hint: "Sent as `last_name`." },
    { key: "company", label: "Company", type: "string" },
    { key: "jobTitle", label: "Job title", type: "string", hint: "Sent as `job_title`." },
    { key: "phone", label: "Phone", type: "string" },
    {
      key: "streetAddress",
      label: "Street address",
      type: "string",
      hint: "Sent as `street_address`.",
    },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State", type: "string" },
    { key: "postalCode", label: "Postal code", type: "string", hint: "Sent as `postal_code`." },
    { key: "country", label: "Country", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "company", type: "string", label: "Company" },
  ],

  async execute(input, ctx) {
    const body = compact({
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      company: input.company,
      job_title: input.jobTitle,
      phone: input.phone,
      street_address: input.streetAddress,
      city: input.city,
      state: input.state,
      postal_code: input.postalCode,
      country: input.country,
    });
    return await new PandaDocClient(ctx).request("/contacts", { method: "POST", body });
  },
};

export default contactCreate;
