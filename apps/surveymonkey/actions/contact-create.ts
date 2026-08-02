import type { ActionDefinition } from "@w6w/types";
import { compact, SurveyMonkeyClient } from "../lib/client.ts";

interface Input {
  contactListId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
}

/**
 * POST /contact_lists/{id}/contacts — add a contact to a contact list.
 * SurveyMonkey requires either `email` or `phone_number`.
 */
const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Add Contact",
  description: "Add a contact to a contact list, by email or phone number.",
  // SurveyMonkey mints a new contact id per call; there is no request key to dedupe on.
  idempotent: false,
  params: [
    { key: "contactListId", label: "Contact List ID", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string", required: true },
    { key: "lastName", label: "Last name", type: "string", required: true },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Required if phone number is not given.",
    },
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
      hint: "Required if email is not given.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "href", type: "string", label: "Self link" },
  ],

  execute(input, ctx) {
    const body = compact({
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone_number: input.phoneNumber,
    });

    return new SurveyMonkeyClient(ctx).request(
      `/contact_lists/${encodeURIComponent(input.contactListId)}/contacts`,
      { method: "POST", body },
    );
  },
};

export default contactCreate;
