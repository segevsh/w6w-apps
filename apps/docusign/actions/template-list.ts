import type { ActionDefinition } from "@w6w/types";
import { DocusignClient } from "../lib/client.ts";
import { paging, type PagingInput } from "../lib/params.ts";

interface Input extends PagingInput {
  searchText?: string;
  folderIds?: string;
  templateIds?: string;
  include?: string;
  orderBy?: string;
  order?: string;
  userFilter?: string;
  sharedByMe?: boolean;
}

/**
 * `GET /restapi/v2.1/accounts/{accountId}/templates` — `Templates: list`.
 *
 * The action a workflow runs first: `envelope-create-from-template` needs a
 * template GUID, and this is where it comes from.
 *
 * `user_filter` is worth knowing about — Docusign scopes template visibility by
 * sharing, so `owned_by_me`, `shared_with_me` and `all` return genuinely
 * different sets for the same credential. Left unset, Docusign applies its own
 * default rather than a value invented here.
 */
const templateList: ActionDefinition<Input> = {
  key: "template-list",
  type: "search",
  resource: "template",
  title: "List Templates",
  description: "List the account's envelope templates, with their IDs and roles.",
  params: [
    { key: "searchText", label: "Search text", type: "string" },
    {
      key: "templateIds",
      label: "Template IDs",
      type: "string",
      hint: "Comma-separated template GUIDs to restrict the result to.",
    },
    {
      key: "folderIds",
      label: "Folder IDs",
      type: "string",
      hint: "Comma-separated folder GUIDs.",
    },
    {
      key: "include",
      label: "Include",
      type: "string",
      hint:
        "Comma-separated extras: recipients, documents, custom_fields, notification, powerforms, folders.",
    },
    {
      key: "orderBy",
      label: "Order by",
      type: "string",
      hint: "e.g. `name`, `modified`, `used`.",
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
    },
    {
      key: "userFilter",
      label: "User filter",
      type: "string",
      hint: "Sharing scope: `owned_by_me`, `shared_with_me` or `all`.",
    },
    {
      key: "sharedByMe",
      label: "Shared by me",
      type: "boolean",
      hint: "Restrict to templates this user has shared.",
    },
    ...paging,
  ],
  output: [
    { key: "envelopeTemplates", type: "array", label: "Templates" },
    { key: "resultSetSize", type: "string", label: "Result set size" },
    { key: "totalSetSize", type: "string", label: "Total set size" },
    { key: "nextUri", type: "string", label: "Next page URI" },
  ],

  execute(input, ctx) {
    return new DocusignClient(ctx).request("/templates", {
      query: {
        search_text: input.searchText,
        template_ids: input.templateIds,
        folder_ids: input.folderIds,
        include: input.include,
        order_by: input.orderBy,
        order: input.order,
        user_filter: input.userFilter,
        shared_by_me: input.sharedByMe,
        count: input.count,
        start_position: input.startPosition,
      },
    });
  },
};

export default templateList;
