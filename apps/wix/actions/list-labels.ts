import type { ActionDefinition } from "@w6w/types";
import {
  OFFSET_PAGE_PARAMS,
  type OffsetPageInput,
  offsetPageQuery,
  PAGING_OUTPUT,
  WixClient,
} from "../lib/client.ts";

interface Input extends OffsetPageInput {
  labelType?: "SYSTEM" | "USER_DEFINED" | "WIX_APP_DEFINED";
  language?: string;
  sortFieldName?: string;
  sortOrder?: "ASC" | "DESC";
}

/** `GET /contacts/v4/labels` — handler `wix.contacts.v4.label:ListLabels`. */
const listLabels: ActionDefinition<Input> = {
  key: "list-labels",
  type: "search",
  resource: "label",
  title: "List Labels",
  description:
    "List the contact labels defined on the site. Label Contact needs a label's `key`, and this is where to find it.",
  params: [
    {
      key: "labelType",
      label: "Label type",
      type: "select",
      options: [
        { value: "SYSTEM", label: "System" },
        { value: "USER_DEFINED", label: "User defined" },
        { value: "WIX_APP_DEFINED", label: "Wix app defined" },
      ],
      hint: "Omit to list all types.",
    },
    {
      key: "language",
      label: "Language",
      type: "string",
      hint: "2-letter code, e.g. `es`. Translates the display names of system labels.",
    },
    { key: "sortFieldName", label: "Sort field", type: "string" },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [
        { value: "ASC", label: "Ascending" },
        { value: "DESC", label: "Descending" },
      ],
    },
    ...OFFSET_PAGE_PARAMS,
  ],
  output: [
    { key: "labels", type: "array", label: "Labels" },
    ...PAGING_OUTPUT,
  ],

  execute(input, ctx) {
    return new WixClient(ctx).request("/contacts/v4/labels", {
      query: {
        ...offsetPageQuery(input),
        labelType: input.labelType,
        language: input.language,
        "sort.fieldName": input.sortFieldName,
        "sort.order": input.sortOrder,
      },
    });
  },
};

export default listLabels;
