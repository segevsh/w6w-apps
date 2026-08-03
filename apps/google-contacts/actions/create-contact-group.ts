import type { ActionDefinition } from "@w6w/types";
import { fieldMask, fieldOptions, GoogleContactsClient, GROUP_FIELDS } from "../lib/client.ts";

interface Input {
  name: string;
  clientData?: unknown;
  readGroupFields?: string | string[];
}

/**
 * `contactGroups.create` — create a user contact group (label).
 * POST /v1/contactGroups
 *
 * Unusually for this API the masks travel in the **body**, not the query
 * string: `{ contactGroup, readGroupFields }`.
 *
 * `idempotent: false` — group names must be unique per user, so a retry after a
 * successful create answers 409 rather than being a no-op.
 */
const createContactGroup: ActionDefinition<Input> = {
  key: "create-contact-group",
  type: "perform",
  resource: "contact-group",
  title: "Create Contact Group",
  description: "Create a new contact group (label). Names must be unique for the user.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      hint: "Must be unique among the user's groups — a duplicate is a 409.",
    },
    {
      key: "clientData",
      label: "Client Data",
      type: "json",
      hint: "Optional arbitrary key/value pairs to store on the group.",
    },
    {
      key: "readGroupFields",
      label: "Read Group Fields",
      type: "multiselect",
      options: fieldOptions(GROUP_FIELDS),
      hint: "Optional. Selects what the response returns; defaults to metadata, groupType, name.",
    },
  ],
  output: [
    { key: "resourceName", type: "string", label: "Resource name" },
    { key: "etag", type: "string", label: "ETag" },
    { key: "name", type: "string", label: "Name" },
    { key: "groupType", type: "string", label: "Group type" },
  ],

  execute(input, ctx) {
    const name = (input.name ?? "").trim();
    if (!name) throw new Error("`name` is required — a contact group must be named.");
    const contactGroup: Record<string, unknown> = { name };
    if (input.clientData !== undefined) contactGroup.clientData = input.clientData;

    const client = new GoogleContactsClient(ctx);
    return client.request("/contactGroups", {
      method: "POST",
      body: {
        contactGroup,
        readGroupFields: fieldMask(input.readGroupFields),
      },
    });
  },
};

export default createContactGroup;
