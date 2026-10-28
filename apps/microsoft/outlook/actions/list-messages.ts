import type { ActionDefinition } from "@w6w/types";
import {
  GraphClient,
  odataList,
  type PagedResult,
  preferHeaders,
  searchTerm,
} from "../lib/client.ts";
import { bodyContentTypeParam, odataParams, pagingParams } from "../lib/params.ts";

interface Input {
  folderId?: string;
  search?: string;
  filter?: string;
  select?: string[];
  orderby?: string;
  top?: number;
  skip?: number;
  bodyContentType?: string;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

/**
 * `GET /me/messages`, or `GET /me/mailFolders/{id}/messages` when scoped.
 *
 * https://learn.microsoft.com/en-us/graph/api/user-list-messages
 *
 * Unlike Gmail, Graph returns whole message objects rather than bare ids, so
 * there is usually no hydration step — reach for `$select` instead, which the
 * docs specifically recommend to avoid the gateway timeout on large pages.
 *
 * Requires `Mail.ReadBasic` at minimum (`Mail.Read` for full bodies).
 */
const listMessages: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-messages",
  type: "search",
  resource: "message",
  title: "List Messages",
  description: "List or search messages in the mailbox, optionally scoped to one mail folder.",
  params: [
    {
      key: "folderId",
      label: "Mail folder",
      type: "string",
      hint:
        "Folder id, or a well-known name: `inbox`, `drafts`, `sentitems`, `deleteditems`, `archive`, `junkemail`, `outbox`, `clutter`, `conversationhistory`, `msgfolderroot`, `scheduled`, `searchfolders`, `conflicts`, `localfailures`, `serverfailures`, `syncissues`, `recoverableitemsdeletions`. Leave empty to search the whole mailbox.",
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      placeholder: "from:alice@example.com",
      hint:
        "OData `$search` (KQL). Bare text matches from, subject and body; or target a property — `subject:report`, `from:alice`, `hasAttachment:true`. Results are always sorted by sent date and capped at 1000 by the service.",
    },
    ...odataParams({
      filterHint:
        "OData `$filter`, e.g. `isRead eq false`. When combined with `Order by`, every ordered property must also appear here, in the same order and before any others — otherwise Graph fails with `InefficientFilter`.",
      orderbyHint:
        "OData `$orderby`, e.g. `receivedDateTime desc`. See the filter hint for the pairing rule.",
    }),
    ...pagingParams({ defaultTop: 25, maxTop: 1000 }),
    bodyContentTypeParam,
  ],
  output: [
    { key: "value", type: "array", label: "Messages" },
    { key: "nextLink", type: "string", label: "Next link" },
    { key: "pages", type: "number", label: "Pages fetched" },
  ],

  execute(input, ctx): Promise<PagedResult<Record<string, unknown>>> {
    const client = new GraphClient(ctx);
    const path = input.folderId
      ? `/me/mailFolders/${encodeURIComponent(input.folderId)}/messages`
      : "/me/messages";
    const options = {
      query: {
        $search: searchTerm(input.search),
        $filter: input.filter,
        $select: odataList(input.select),
        $orderby: input.orderby,
        $top: input.top,
        $skip: input.skip,
      },
      headers: preferHeaders({ bodyContentType: input.bodyContentType }),
    };

    // A nextLink already encodes every query parameter from the original call,
    // so it is replayed verbatim rather than re-decorated.
    const target = input.nextLink ?? path;
    const opts = input.nextLink ? { headers: options.headers } : options;

    return input.all
      ? client.collect(target, opts, input.maxPages ?? 10)
      : client.page(target, opts);
  },
};

export default listMessages;
