import type { ActionDefinition } from "@w6w/types";
import {
  OFFSET_PAGE_PARAMS,
  type OffsetPageInput,
  offsetPageQuery,
  PAGING_OUTPUT,
  WixClient,
} from "../lib/client.ts";

interface Input extends OffsetPageInput {
  sortFieldName?: string;
  sortOrder?: "ASC" | "DESC";
  fields?: string;
  fieldsets?: string;
}

/** `GET /contacts/v4/contacts` — handler `wix.contacts.v4.contact:ListContacts`. */
const listContacts: ActionDefinition<Input> = {
  key: "list-contacts",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description:
    "List the site's contacts in a simple sorted page. Use Query Contacts when you need to filter.",
  params: [
    {
      key: "sortFieldName",
      label: "Sort field",
      type: "string",
      hint:
        "One of `createdDate`, `lastActivity.activityDate`, `primaryInfo.email`, `info.name.first`, `info.name.last`, `info.company`, `info.jobTitle`, `info.birthdate`.",
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [
        { value: "ASC", label: "Ascending" },
        { value: "DESC", label: "Descending" },
      ],
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint:
        "Comma-separated projection, e.g. `info.name,info.emails`. `id` and `revision` always return.",
    },
    {
      key: "fieldsets",
      label: "Fieldsets",
      type: "string",
      hint:
        "Comma-separated preset projections: `BASIC`, `COMMUNICATION_DETAILS`, `EXTENDED`, `FULL`.",
    },
    ...OFFSET_PAGE_PARAMS,
  ],
  output: [
    { key: "contacts", type: "array", label: "Contacts" },
    ...PAGING_OUTPUT,
  ],

  execute(input, ctx) {
    // `fields` and `fieldsets` repeat rather than comma-join in Wix's own
    // examples (`?fields=source&fields=info.name`), so they are expanded here
    // instead of going through the shared single-value query encoder.
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(offsetPageQuery(input))) {
      if (v !== undefined) params.set(k, String(v));
    }
    if (input.sortFieldName) params.set("sort.fieldName", input.sortFieldName);
    if (input.sortOrder) params.set("sort.order", input.sortOrder);
    for (const f of (input.fields ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
      params.append("fields", f);
    }
    for (const f of (input.fieldsets ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
      params.append("fieldsets", f);
    }

    const qs = params.toString();
    return new WixClient(ctx).request(`/contacts/v4/contacts${qs ? `?${qs}` : ""}`);
  },
};

export default listContacts;
