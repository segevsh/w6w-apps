import type { ActionDefinition } from "@w6w/types";
import {
  assertUpdateEtag,
  fieldMask,
  fieldOptions,
  GoogleContactsClient,
  mandatoryFieldMask,
  personResource,
  stringList,
  UPDATE_PERSON_FIELDS,
} from "../lib/client.ts";

interface Input {
  resourceName: string;
  person: Record<string, unknown>;
  updatePersonFields: string | string[];
  personFields?: string | string[];
  sources?: string | string[];
}

/**
 * `people.updateContact` — update an existing contact.
 * PATCH /v1/{person.resourceName=people/*}:updateContact
 *
 * Three requirements the API enforces and this action fails fast on rather than
 * letting a bare 400 come back:
 *
 *   1. **`updatePersonFields` is required** and has no default. Google clears
 *      any field named in the mask but absent from the body, so guessing it
 *      would silently delete data.
 *   2. **The body must carry the etag** read with the contact
 *      (`person.etag` or `person.metadata.sources[].etag`) — this is the
 *      optimistic-concurrency check that stops a concurrent edit being
 *      clobbered. Read with Get Person first.
 *   3. The mask only accepts *writable* fields — `metadata`, `photos`,
 *      `coverPhotos`, `ageRanges` and `skills` are read-only and are absent
 *      from this param's options for that reason.
 *
 * `idempotent: true` — the same body with the same etag either applies once or
 * is rejected by the etag check, so a retry cannot double-apply.
 */
const updateContact: ActionDefinition<Input> = {
  key: "update-contact",
  type: "perform",
  resource: "person",
  title: "Update Contact",
  description: "Update fields on an existing contact. Requires the etag read with the contact.",
  idempotent: true,
  params: [
    {
      key: "resourceName",
      label: "Resource Name",
      type: "string",
      required: true,
      placeholder: "people/c1234567890",
    },
    {
      key: "person",
      label: "Person",
      type: "json",
      required: true,
      hint:
        "The Person resource to write. Must include the `etag` (or `metadata.sources[].etag`) returned by Get Person.",
    },
    {
      key: "updatePersonFields",
      label: "Update Person Fields",
      type: "multiselect",
      required: true,
      options: fieldOptions(UPDATE_PERSON_FIELDS),
      hint:
        "Required, no default. A field named here but missing from the body is CLEARED — name only what you are writing.",
    },
    {
      key: "personFields",
      label: "Person Fields (response)",
      type: "multiselect",
      options: fieldOptions(UPDATE_PERSON_FIELDS),
      hint: "Optional. Restricts what the response echoes back; defaults to all fields.",
    },
    {
      key: "sources",
      label: "Sources",
      type: "multiselect",
      options: [
        { value: "READ_SOURCE_TYPE_CONTACT", label: "Contact" },
        { value: "READ_SOURCE_TYPE_PROFILE", label: "Profile" },
      ],
      hint: "Filters the source types in the response.",
    },
  ],
  output: [
    { key: "resourceName", type: "string", label: "Resource name" },
    { key: "etag", type: "string", label: "ETag (the new one — reuse it for the next update)" },
    { key: "names", type: "array", label: "Names" },
    { key: "emailAddresses", type: "array", label: "Email addresses" },
    { key: "phoneNumbers", type: "array", label: "Phone numbers" },
  ],

  execute(input, ctx) {
    assertUpdateEtag(input.person);
    const client = new GoogleContactsClient(ctx);
    return client.request(`/${personResource(input.resourceName)}:updateContact`, {
      method: "PATCH",
      query: {
        updatePersonFields: mandatoryFieldMask(input.updatePersonFields, "updatePersonFields"),
        personFields: fieldMask(input.personFields),
        sources: stringList(input.sources),
      },
      body: input.person,
    });
  },
};

export default updateContact;
