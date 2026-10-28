import type { ActionDefinition } from "@w6w/types";
import { buildSearch, LinkedInAdsClient, triState } from "../lib/client.ts";
import {
  accountStatusOptions,
  accountTypeOptions,
  cursorPaginationParams,
  sortOrderParam,
  testFilterParam,
} from "../lib/params.ts";

interface Input {
  ids?: string;
  names?: string;
  references?: string;
  statuses?: string[];
  types?: string[];
  test?: string;
  sortOrder?: string;
  pageSize?: number;
  pageToken?: string;
}

const csv = (v: string | undefined): string[] | undefined =>
  v ? v.split(",").map((s) => s.trim()).filter(Boolean) : undefined;

/**
 * `GET /rest/adAccounts?q=search` — search by id, name, reference, type and
 * status; every field is a list, ORed within itself and ANDed across fields.
 * Omitting every filter still requires `q=search`, and returns every account
 * the caller has access to (per the vendor's own doc) — which, at the
 * Advertising API's development tier, means only the accounts explicitly
 * mapped to this Developer app in the Developer Portal. See `auth/oauth2.ts`.
 *
 * Cursor-paginated (`pageSize`/`pageToken` in, `metadata.nextPageToken` out)
 * since API version 202401 — the older `start`/`count` index form this
 * endpoint used before that is not implemented here.
 */
const adAccountList: ActionDefinition<Input> = {
  key: "ad-account-list",
  type: "search",
  resource: "ad-account",
  title: "List Ad Accounts",
  description: "Search Ad Accounts the connected app can access, by ID, name, reference, type " +
    "or status.",
  params: [
    { key: "ids", label: "Account IDs", type: "string", hint: "Comma-separated numeric ids." },
    { key: "names", label: "Names", type: "string", hint: "Comma-separated, matched exactly." },
    {
      key: "references",
      label: "References",
      type: "string",
      hint: "Comma-separated urn:li:organization:{id} or urn:li:person:{id} values.",
    },
    { key: "statuses", label: "Statuses", type: "multiselect", options: accountStatusOptions },
    { key: "types", label: "Types", type: "multiselect", options: accountTypeOptions },
    testFilterParam,
    sortOrderParam,
    ...cursorPaginationParams(50),
  ],
  output: [
    { key: "elements", type: "array", label: "Ad accounts" },
    { key: "metadata", type: "object", label: "Paging metadata (nextPageToken)" },
  ],

  execute(input, ctx) {
    const search = buildSearch([
      { field: "id", values: csv(input.ids) },
      { field: "name", values: csv(input.names) },
      { field: "reference", values: csv(input.references) },
      { field: "status", values: input.statuses },
      { field: "type", values: input.types },
      { field: "test", scalar: triState(input.test) },
    ]);

    const client = new LinkedInAdsClient(ctx);
    return client.request("/rest/adAccounts", {
      query: {
        q: "search",
        search: search || undefined,
        sortOrder: input.sortOrder,
        pageSize: String(input.pageSize ?? 50),
        pageToken: input.pageToken,
      },
    });
  },
};

export default adAccountList;
