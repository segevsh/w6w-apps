import type { ActionDefinition } from "@w6w/types";
import {
  DEFAULT_PERSON_FIELDS,
  fieldOptions,
  GoogleContactsClient,
  PERSON_FIELDS,
  requiredFieldMask,
  stringList,
} from "../lib/client.ts";

interface Input {
  person: Record<string, unknown>;
  personFields?: string | string[];
  sources?: string | string[];
}

/**
 * `people.createContact` — create one contact.
 * POST /v1/people:createContact
 *
 * `personFields` is **required** on this write method too (it selects what the
 * response echoes back), which is easy to miss because it is a query parameter
 * on a POST.
 *
 * `idempotent: false` — the API mints a new `resourceName` per call and offers
 * no request-id/dedupe parameter, so a retry creates a duplicate contact.
 */
const createContact: ActionDefinition<Input> = {
  key: "create-contact",
  type: "perform",
  resource: "person",
  title: "Create Contact",
  description: "Create a new contact in the authenticated user's address book.",
  idempotent: false,
  params: [
    {
      key: "person",
      label: "Person",
      type: "json",
      required: true,
      placeholder: '{"names":[{"givenName":"Ada","familyName":"Lovelace"}]}',
      hint:
        "A Person resource. The singleton fields (names, biographies, birthdays, genders) accept at most one value — more is a 400.",
    },
    {
      key: "personFields",
      label: "Person Fields",
      type: "multiselect",
      required: true,
      default: DEFAULT_PERSON_FIELDS.split(","),
      options: fieldOptions(PERSON_FIELDS),
      hint: "Required by Google. Selects which fields come back on the created contact.",
    },
    {
      key: "sources",
      label: "Sources",
      type: "multiselect",
      options: [
        { value: "READ_SOURCE_TYPE_CONTACT", label: "Contact" },
        { value: "READ_SOURCE_TYPE_PROFILE", label: "Profile" },
      ],
      hint: "Defaults to both contact and profile sources.",
    },
  ],
  output: [
    { key: "resourceName", type: "string", label: "Resource name" },
    { key: "etag", type: "string", label: "ETag" },
    { key: "names", type: "array", label: "Names" },
    { key: "emailAddresses", type: "array", label: "Email addresses" },
    { key: "phoneNumbers", type: "array", label: "Phone numbers" },
  ],

  execute(input, ctx) {
    if (!input.person || typeof input.person !== "object") {
      throw new Error("`person` is required — pass a Person resource object.");
    }
    const client = new GoogleContactsClient(ctx);
    return client.request("/people:createContact", {
      method: "POST",
      query: {
        personFields: requiredFieldMask(input.personFields),
        sources: stringList(input.sources),
      },
      body: input.person,
    });
  },
};

export default createContact;
