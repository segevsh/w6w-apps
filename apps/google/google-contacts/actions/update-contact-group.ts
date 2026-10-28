import type { ActionDefinition } from "@w6w/types";
import {
  contactGroupName,
  contactGroupResource,
  fieldMask,
  fieldOptions,
  GoogleContactsClient,
  GROUP_FIELDS,
  UPDATE_GROUP_FIELDS,
} from "../lib/client.ts";

interface Input {
  resourceName: string;
  name?: string;
  etag?: string;
  clientData?: unknown;
  updateGroupFields?: string | string[];
  readGroupFields?: string | string[];
}

/**
 * `contactGroups.update` — rename a group or replace its client data.
 * PUT /v1/{contactGroup.resourceName=contactGroups/*}
 *
 * Note this is a **PUT**, and the masks travel in the body alongside the group:
 * `{ contactGroup, updateGroupFields, readGroupFields }`. Only `name` and
 * `clientData` are writable — `updateGroupFields` defaults to `name`.
 *
 * The body's `contactGroup.resourceName` must match the path, so it is filled
 * in from the same param rather than asked for twice.
 *
 * `idempotent: true` — writing the same name twice lands on the same state.
 */
const updateContactGroup: ActionDefinition<Input> = {
  key: "update-contact-group",
  type: "perform",
  resource: "contact-group",
  title: "Update Contact Group",
  description: "Rename a user contact group or replace its client data.",
  idempotent: true,
  params: [
    {
      key: "resourceName",
      label: "Resource Name",
      type: "string",
      required: true,
      placeholder: "contactGroups/1a2b3c",
      hint: "System groups cannot be updated — only user-made ones.",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: "The new group name. Must stay unique for the user — a duplicate is a 409.",
    },
    {
      key: "etag",
      label: "ETag",
      type: "string",
      hint: "Optional. The etag read with the group, for optimistic concurrency.",
    },
    { key: "clientData", label: "Client Data", type: "json" },
    {
      key: "updateGroupFields",
      label: "Update Group Fields",
      type: "multiselect",
      default: ["name"],
      options: fieldOptions(UPDATE_GROUP_FIELDS),
      hint: "Only `name` and `clientData` are writable. Defaults to `name`.",
    },
    {
      key: "readGroupFields",
      label: "Read Group Fields",
      type: "multiselect",
      options: fieldOptions(GROUP_FIELDS),
      hint: "Optional. Selects what the response returns.",
    },
  ],
  output: [
    { key: "resourceName", type: "string", label: "Resource name" },
    { key: "etag", type: "string", label: "ETag" },
    { key: "name", type: "string", label: "Name" },
    { key: "groupType", type: "string", label: "Group type" },
  ],

  execute(input, ctx) {
    const contactGroup: Record<string, unknown> = {
      resourceName: contactGroupName(input.resourceName),
    };
    if (input.name !== undefined) contactGroup.name = input.name;
    if (input.etag !== undefined && input.etag !== "") contactGroup.etag = input.etag;
    if (input.clientData !== undefined) contactGroup.clientData = input.clientData;

    const client = new GoogleContactsClient(ctx);
    return client.request(`/${contactGroupResource(input.resourceName)}`, {
      method: "PUT",
      body: {
        contactGroup,
        updateGroupFields: fieldMask(input.updateGroupFields) ?? "name",
        readGroupFields: fieldMask(input.readGroupFields),
      },
    });
  },
};

export default updateContactGroup;
