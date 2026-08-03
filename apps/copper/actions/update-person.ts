import type { ActionDefinition } from "@w6w/types";
import { compact, CopperClient, CUSTOM_FIELDS_PARAM } from "../lib/client.ts";

interface Input {
  personId: number | string;
  name?: string;
  emails?: unknown[] | null;
  phoneNumbers?: unknown[] | null;
  address?: Record<string, unknown> | null;
  socials?: unknown[] | null;
  websites?: unknown[] | null;
  title?: string | null;
  details?: string | null;
  contactTypeId?: number | null;
  assigneeId?: number | null;
  tags?: string[] | null;
  customFields?: unknown[] | null;
}

/**
 * `PUT /people/{id}` — update a Person.
 *
 * Copper's PUT behaves as a PATCH: "Updates are only applied to fields
 * explicitly specified in the request body. For example, if an update request is
 * made with an empty body, no updates will be made. To remove the value from a
 * field, the request body must specify the target field value as 'null'."
 *
 * That makes the `undefined` / `null` distinction load-bearing, and it is
 * preserved deliberately: fields left blank are stripped from the body by
 * `compact` and so are untouched, while an explicit JSON `null` is forwarded and
 * clears the field.
 *
 * **`company_id` is not updatable here.** Copper returns it on the Person but
 * documents that re-pointing a Person at a different Company must go through the
 * Related Items API — "if you would like to unrelate and relate a new
 * `company_id`, use the related items API call". It is therefore not offered as
 * a param rather than offered and silently ignored.
 *
 * Idempotent: applying the same body twice leaves the same record.
 */
const updatePerson: ActionDefinition<Input> = {
  key: "update-person",
  type: "perform",
  resource: "person",
  title: "Update Person",
  description:
    "Update a Person. Only the fields you supply change; send an explicit `null` to clear one. " +
    "Re-pointing a Person at a different Company needs the Related Items API, not this action.",
  idempotent: true,
  params: [
    { key: "personId", label: "Person ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    {
      key: "emails",
      label: "Emails",
      type: "json",
      hint: 'JSON array, e.g. `[{"email": "jim@example.com", "category": "work"}]`. Replaces the ' +
        "whole list.",
    },
    {
      key: "phoneNumbers",
      label: "Phone numbers",
      type: "json",
      hint: 'JSON array, e.g. `[{"number": "415-123-4567", "category": "mobile"}]`. Replaces the ' +
        "whole list.",
    },
    {
      key: "address",
      label: "Address",
      type: "json",
      hint: "JSON object with `street`, `city`, `state`, `postal_code`, `country`.",
    },
    { key: "socials", label: "Socials", type: "json", hint: "JSON array of `{url, category}`." },
    { key: "websites", label: "Websites", type: "json", hint: "JSON array of `{url, category}`." },
    { key: "title", label: "Job title", type: "string" },
    { key: "details", label: "Details", type: "text" },
    { key: "contactTypeId", label: "Contact type ID", type: "number" },
    { key: "assigneeId", label: "Assignee (User) ID", type: "number" },
    { key: "tags", label: "Tags", type: "json", hint: "JSON array of strings. Replaces the list." },
    CUSTOM_FIELDS_PARAM,
  ],
  output: [
    { key: "id", type: "number", label: "Person ID" },
    { key: "date_modified", type: "number", label: "Modified at (Unix seconds)" },
  ],

  execute(input, ctx) {
    return new CopperClient(ctx).request(
      `/people/${encodeURIComponent(String(input.personId))}`,
      {
        method: "PUT",
        body: compact({
          name: input.name,
          emails: input.emails,
          phone_numbers: input.phoneNumbers,
          address: input.address,
          socials: input.socials,
          websites: input.websites,
          title: input.title,
          details: input.details,
          contact_type_id: input.contactTypeId,
          assignee_id: input.assigneeId,
          tags: input.tags,
          custom_fields: input.customFields,
        }),
      },
    );
  },
};

export default updatePerson;
