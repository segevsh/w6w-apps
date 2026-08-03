import type { ActionDefinition } from "@w6w/types";
import {
  contactGroupResource,
  fieldMask,
  fieldOptions,
  GoogleContactsClient,
  GROUP_FIELDS,
} from "../lib/client.ts";

interface Input {
  resourceName: string;
  maxMembers?: number;
  groupFields?: string | string[];
}

/**
 * `contactGroups.get` — read one contact group, optionally with its members.
 * GET /v1/{resourceName=contactGroups/*}
 *
 * `maxMembers` defaults to **0**, i.e. the group comes back with no
 * `memberResourceNames` at all unless it is set. That is the usual surprise
 * with this endpoint, so the param carries the warning.
 */
const getContactGroup: ActionDefinition<Input> = {
  key: "get-contact-group",
  type: "read",
  resource: "contact-group",
  title: "Get Contact Group",
  description: "Read a single contact group, optionally including its member resource names.",
  params: [
    {
      key: "resourceName",
      label: "Resource Name",
      type: "string",
      required: true,
      placeholder: "contactGroups/myContacts",
      hint: "A system group (`myContacts`, `starred`) or a user group id.",
    },
    {
      key: "maxMembers",
      label: "Max Members",
      type: "number",
      validation: { min: 0, integer: true },
      hint: "Defaults to 0 — leave unset and NO member resource names are returned.",
    },
    {
      key: "groupFields",
      label: "Group Fields",
      type: "multiselect",
      options: fieldOptions(GROUP_FIELDS),
      hint: "Optional. Defaults to metadata, groupType, memberCount and name.",
    },
  ],
  output: [
    { key: "resourceName", type: "string", label: "Resource name" },
    { key: "etag", type: "string", label: "ETag" },
    { key: "name", type: "string", label: "Name" },
    { key: "groupType", type: "string", label: "Group type" },
    { key: "memberCount", type: "number", label: "Member count" },
    { key: "memberResourceNames", type: "array", label: "Member resource names" },
  ],

  execute(input, ctx) {
    const client = new GoogleContactsClient(ctx);
    return client.request(`/${contactGroupResource(input.resourceName)}`, {
      query: {
        maxMembers: input.maxMembers,
        groupFields: fieldMask(input.groupFields),
      },
    });
  },
};

export default getContactGroup;
