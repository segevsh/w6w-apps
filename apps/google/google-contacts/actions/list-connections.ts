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
  resourceName?: string;
  personFields?: string | string[];
  pageSize?: number;
  pageToken?: string;
  sortOrder?: string;
  requestSyncToken?: boolean;
  syncToken?: string;
  sources?: string | string[];
}

/**
 * `people.connections.list` — the user's contact list.
 * GET /v1/{resourceName=people/*}/connections
 *
 * `resourceName` is only ever `people/me`: Google's reference states the
 * request must be for the authenticated user, so it is fixed as the default
 * rather than presented as a free choice.
 */
const listConnections: ActionDefinition<Input> = {
  key: "list-connections",
  type: "read",
  resource: "person",
  title: "List Connections",
  description: "List the authenticated user's contacts (connections), one page at a time.",
  params: [
    {
      key: "resourceName",
      label: "Resource Name",
      type: "string",
      default: "people/me",
      hint: "Must be `people/me` — the API only lists the authenticated user's own connections.",
    },
    {
      key: "personFields",
      label: "Person Fields",
      type: "multiselect",
      required: true,
      default: DEFAULT_PERSON_FIELDS.split(","),
      options: fieldOptions(PERSON_FIELDS),
      hint: "Required by Google. Only the fields named here are returned.",
    },
    {
      key: "pageSize",
      label: "Page Size",
      type: "number",
      default: 100,
      validation: { min: 1, max: 1000, integer: true },
      hint: "1–1000. Defaults to 100.",
    },
    { key: "pageToken", label: "Page Token", type: "string" },
    {
      key: "sortOrder",
      label: "Sort Order",
      type: "select",
      options: [
        { value: "LAST_MODIFIED_ASCENDING", label: "Last modified (ascending)" },
        { value: "LAST_MODIFIED_DESCENDING", label: "Last modified (descending)" },
        { value: "FIRST_NAME_ASCENDING", label: "First name (ascending)" },
        { value: "LAST_NAME_ASCENDING", label: "Last name (ascending)" },
      ],
      hint: "Ignored when `syncToken` is set. Defaults to LAST_MODIFIED_ASCENDING.",
    },
    {
      key: "requestSyncToken",
      label: "Request Sync Token",
      type: "boolean",
      hint: "Ask for a `nextSyncToken` so a later run can fetch only what changed.",
    },
    {
      key: "syncToken",
      label: "Sync Token",
      type: "string",
      hint: "Return only contacts changed since this token was issued.",
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
    { key: "connections", type: "array", label: "Connections (Person[])" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
    { key: "nextSyncToken", type: "string", label: "Next sync token" },
    { key: "totalPeople", type: "number", label: "Total people" },
    { key: "totalItems", type: "number", label: "Total items" },
  ],

  execute(input, ctx) {
    const client = new GoogleContactsClient(ctx);
    return client.request(`/${personResource(input.resourceName ?? "people/me")}/connections`, {
      query: {
        personFields: requiredFieldMask(input.personFields),
        pageSize: input.pageSize,
        pageToken: input.pageToken,
        sortOrder: input.sortOrder,
        requestSyncToken: input.requestSyncToken,
        syncToken: input.syncToken,
        sources: stringList(input.sources),
      },
    });
  },
};

export default listConnections;
