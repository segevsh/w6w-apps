import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, type PagedResult } from "../lib/client.ts";
import { odataParams, pagingParams } from "../lib/params.ts";

interface Input {
  parentFolderId?: string;
  includeHiddenFolders?: boolean;
  filter?: string;
  select?: string[];
  orderby?: string;
  top?: number;
  skip?: number;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

/**
 * `GET /me/mailFolders`, or `GET /me/mailFolders/{id}/childFolders`.
 *
 * https://learn.microsoft.com/en-us/graph/api/user-list-mailfolders
 * https://learn.microsoft.com/en-us/graph/api/mailfolder-list-childfolders
 *
 * The root listing returns only the *direct* children of the mailbox root —
 * Graph does not flatten the hierarchy, so a full tree means walking
 * `childFolders` per folder, which is what `parentFolderId` is for.
 *
 * Both forms honour `includeHiddenFolders=true`; without it, folders whose
 * `isHidden` is true (Clutter, among others) are omitted entirely.
 *
 * Requires `Mail.ReadBasic` at minimum.
 */
const listMailFolders: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-mail-folders",
  type: "read",
  resource: "mail-folder",
  title: "List Mail Folders",
  description: "List mail folders at the mailbox root, or the child folders of one folder.",
  params: [
    {
      key: "parentFolderId",
      label: "Parent folder",
      type: "string",
      hint:
        "Leave empty for the mailbox root. Otherwise a folder id or well-known name (`inbox`, `archive`, `msgfolderroot`, …) whose children you want.",
    },
    {
      key: "includeHiddenFolders",
      label: "Include hidden folders",
      type: "boolean",
      default: false,
      hint: "Hidden folders (`isHidden: true`, e.g. Clutter) are excluded unless this is on.",
    },
    ...odataParams({ orderbyHint: "OData `$orderby`, e.g. `displayName`." }),
    ...pagingParams({ defaultTop: 50 }),
  ],
  output: [
    { key: "value", type: "array", label: "Mail folders" },
    { key: "nextLink", type: "string", label: "Next link" },
    { key: "pages", type: "number", label: "Pages fetched" },
  ],

  execute(input, ctx): Promise<PagedResult<Record<string, unknown>>> {
    const client = new GraphClient(ctx);
    const path = input.parentFolderId
      ? `/me/mailFolders/${encodeURIComponent(input.parentFolderId)}/childFolders`
      : "/me/mailFolders";
    const options = {
      query: {
        // Graph spells this one without the `$` — it is not an OData parameter.
        includeHiddenFolders: input.includeHiddenFolders ? "true" : undefined,
        $filter: input.filter,
        $select: odataList(input.select),
        $orderby: input.orderby,
        $top: input.top,
        $skip: input.skip,
      },
    };

    const target = input.nextLink ?? path;
    const opts = input.nextLink ? {} : options;

    return input.all
      ? client.collect(target, opts, input.maxPages ?? 10)
      : client.page(target, opts);
  },
};

export default listMailFolders;
