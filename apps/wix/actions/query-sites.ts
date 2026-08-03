import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  CURSOR_PAGE_PARAMS,
  type CursorPageInput,
  cursorPaging,
  PAGING_OUTPUT,
  WixClient,
} from "../lib/client.ts";

interface Input extends CursorPageInput {
  filter?: Record<string, unknown>;
  sortFieldName?: string;
  sortOrder?: "ASC" | "DESC";
}

/**
 * `POST /site-list/v2/sites/query` — the one **account-level** action in this app.
 *
 * It is the only endpoint here that sends `wix-account-id` instead of
 * `wix-site-id`, hence `scope: "account"`. It exists because every other action
 * needs a site ID and this is the documented way to discover one from inside a
 * workflow; the alternative is copying a GUID out of a dashboard URL by hand.
 *
 * Caveat, stated because it differs from every other path here: the site-level
 * endpoints were each confirmed against the live service by the handler name in
 * the `x-wix-responded-by` response header. This one sits behind a different
 * gateway that answers an unauthenticated request with an HTML challenge and no
 * such header, so it could not be confirmed the same way. It is included on the
 * strength of Wix's own reference page, which documents this exact URL, method
 * and `wix-account-id` header. Treat it as documented-but-unverified.
 */
const querySites: ActionDefinition<Input> = {
  key: "query-sites",
  type: "search",
  resource: "site",
  title: "Query Sites",
  description:
    "List the sites in the Wix account — the way to discover the site IDs every other action needs. Account-level: requires the connection's Account ID rather than its Site ID.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "json",
      hint: 'Wix API Query Language, e.g. `{"editorType": "EDITOR"}`.',
    },
    {
      key: "sortFieldName",
      label: "Sort field",
      type: "string",
      hint: "e.g. `createdDate`, `displayName`.",
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
    ...CURSOR_PAGE_PARAMS,
  ],
  output: [
    { key: "sites", type: "array", label: "Sites" },
    ...PAGING_OUTPUT,
  ],

  execute(input, ctx) {
    const sort = input.sortFieldName
      ? [{ fieldName: input.sortFieldName, order: input.sortOrder ?? "ASC" }]
      : undefined;

    return new WixClient(ctx).request("/site-list/v2/sites/query", {
      method: "POST",
      scope: "account",
      body: {
        query: compact({
          filter: input.filter,
          sort,
          cursorPaging: cursorPaging(input),
        }),
      },
    });
  },
};

export default querySites;
