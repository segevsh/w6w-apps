import type { ActionDefinition } from "@w6w/types";
import {
  DEFAULT_PERSON_FIELDS,
  fieldOptions,
  GoogleContactsClient,
  PERSON_FIELDS,
  personResource,
  requiredFieldMask,
  stringList,
} from "../lib/client.ts";

interface Input {
  resourceName: string;
  personFields?: string | string[];
  sources?: string | string[];
}

/**
 * `people.get` — read one person.
 * GET /v1/{resourceName=people/*}
 *
 * Read this before `update-contact`: the response carries the `etag` that the
 * update must echo back.
 */
const getPerson: ActionDefinition<Input> = {
  key: "get-person",
  type: "read",
  resource: "person",
  title: "Get Person",
  description:
    "Read a single contact or profile by resource name. Use `people/me` for the authenticated user.",
  params: [
    {
      key: "resourceName",
      label: "Resource Name",
      type: "string",
      required: true,
      default: "people/me",
      placeholder: "people/c1234567890",
      hint: "`people/me`, `people/{account_id}`, or a contact's `people/{person_id}`.",
    },
    {
      key: "personFields",
      label: "Person Fields",
      type: "multiselect",
      required: true,
      default: DEFAULT_PERSON_FIELDS.split(","),
      options: fieldOptions(PERSON_FIELDS),
      hint:
        "Required by Google. Include `metadata` to receive the `etag` needed by Update Contact.",
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
    { key: "metadata", type: "object", label: "Metadata (carries source etags)" },
  ],

  execute(input, ctx) {
    const client = new GoogleContactsClient(ctx);
    return client.request(`/${personResource(input.resourceName)}`, {
      query: {
        personFields: requiredFieldMask(input.personFields),
        sources: stringList(input.sources),
      },
    });
  },
};

export default getPerson;
