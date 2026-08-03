import type { ActionDefinition } from "@w6w/types";
import {
  fieldOptions,
  GoogleContactsClient,
  OTHER_CONTACT_FIELDS,
  requiredFieldMask,
  stringList,
} from "../lib/client.ts";

interface Input {
  readMask?: string | string[];
  pageSize?: number;
  pageToken?: string;
  requestSyncToken?: boolean;
  syncToken?: string;
  sources?: string | string[];
}

/**
 * `otherContacts.list` — the "Other contacts" list: addresses Google collected
 * automatically (someone the user emailed) that were never saved as a contact.
 * GET /v1/otherContacts
 *
 * Two things differ from `list-connections`:
 *   - the mask is `readMask`, and for the default `READ_SOURCE_TYPE_CONTACT`
 *     source only five fields exist at all (emailAddresses, metadata, names,
 *     phoneNumbers, photos) — asking for more is an error, not a wider read;
 *   - it needs the separate `contacts.other.readonly` scope, which the
 *     `contacts` scope does not imply.
 */
const listOtherContacts: ActionDefinition<Input> = {
  key: "list-other-contacts",
  type: "read",
  resource: "other-contact",
  title: "List Other Contacts",
  description:
    "List 'Other contacts' — addresses Google collected automatically that were never saved as contacts.",
  params: [
    {
      key: "readMask",
      label: "Read Mask",
      type: "multiselect",
      required: true,
      default: ["names", "emailAddresses", "phoneNumbers"],
      options: fieldOptions(OTHER_CONTACT_FIELDS),
      hint:
        "Required by Google. Only these five fields exist on an other-contact under the default source.",
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
      key: "requestSyncToken",
      label: "Request Sync Token",
      type: "boolean",
      hint: "Ask for a `nextSyncToken` so a later run can fetch only what changed.",
    },
    { key: "syncToken", label: "Sync Token", type: "string" },
    {
      key: "sources",
      label: "Sources",
      type: "multiselect",
      options: [
        { value: "READ_SOURCE_TYPE_CONTACT", label: "Contact" },
        { value: "READ_SOURCE_TYPE_PROFILE", label: "Profile (requires Contact too)" },
      ],
      hint: "Defaults to READ_SOURCE_TYPE_CONTACT.",
    },
  ],
  output: [
    { key: "otherContacts", type: "array", label: "Other contacts (Person[])" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
    { key: "nextSyncToken", type: "string", label: "Next sync token" },
  ],

  execute(input, ctx) {
    const client = new GoogleContactsClient(ctx);
    return client.request("/otherContacts", {
      query: {
        readMask: requiredFieldMask(input.readMask, "names,emailAddresses,phoneNumbers"),
        pageSize: input.pageSize,
        pageToken: input.pageToken,
        requestSyncToken: input.requestSyncToken,
        syncToken: input.syncToken,
        sources: stringList(input.sources),
      },
    });
  },
};

export default listOtherContacts;
