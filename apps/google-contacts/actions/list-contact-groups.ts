import type { ActionDefinition } from "@w6w/types";
import { fieldMask, fieldOptions, GoogleContactsClient, GROUP_FIELDS } from "../lib/client.ts";

interface Input {
  groupFields?: string | string[];
  pageSize?: number;
  pageToken?: string;
  syncToken?: string;
}

/**
 * `contactGroups.list` — the user's contact groups ("labels" in the Contacts
 * UI), both the system groups (`myContacts`, `starred`, …) and user-made ones.
 * GET /v1/contactGroups
 *
 * `groupFields` is **optional** here, unlike the person masks — omitting it
 * yields metadata, groupType, memberCount and name.
 */
const listContactGroups: ActionDefinition<Input> = {
  key: "list-contact-groups",
  type: "read",
  resource: "contact-group",
  title: "List Contact Groups",
  description: "List the authenticated user's contact groups (labels), system and user-made.",
  params: [
    {
      key: "groupFields",
      label: "Group Fields",
      type: "multiselect",
      options: fieldOptions(GROUP_FIELDS),
      hint: "Optional. Defaults to metadata, groupType, memberCount and name.",
    },
    {
      key: "pageSize",
      label: "Page Size",
      type: "number",
      validation: { min: 1, max: 1000, integer: true },
      hint: "1–1000. Defaults to 30.",
    },
    { key: "pageToken", label: "Page Token", type: "string" },
    {
      key: "syncToken",
      label: "Sync Token",
      type: "string",
      hint: "Return only groups changed since this token was issued.",
    },
  ],
  output: [
    { key: "contactGroups", type: "array", label: "Contact groups" },
    { key: "totalItems", type: "number", label: "Total items" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
    { key: "nextSyncToken", type: "string", label: "Next sync token" },
  ],

  execute(input, ctx) {
    const client = new GoogleContactsClient(ctx);
    return client.request("/contactGroups", {
      query: {
        groupFields: fieldMask(input.groupFields),
        pageSize: input.pageSize,
        pageToken: input.pageToken,
        syncToken: input.syncToken,
      },
    });
  },
};

export default listContactGroups;
