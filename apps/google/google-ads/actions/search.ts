import type { ActionDefinition } from "@w6w/types";
import { GoogleAdsClient } from "../lib/client.ts";
import { customerId, pageToken, searchOutput } from "../lib/params.ts";

interface Input {
  query: string;
  customerId?: string;
  pageToken?: string;
  validateOnly?: boolean;
  returnTotalResultsCount?: boolean;
  returnSummaryRow?: boolean;
}

/**
 * `GoogleAdsService.Search` —
 * `POST /v25/customers/{customerId}/googleAds:search`.
 *
 * The escape hatch, and in practice the most useful action in the app: almost
 * every read in the Google Ads API is a GAQL query rather than a per-resource
 * GET, so the typed list actions here are conveniences over exactly this call.
 * Anything they don't cover — a resource with no action, an unusual join of
 * metrics and segments, a report someone already has the GAQL for — goes
 * through here unchanged.
 *
 * GAQL is `SELECT … FROM … [WHERE …] [ORDER BY …] [LIMIT …] [PARAMETERS …]`,
 * one resource per `FROM`, field paths in snake_case.
 *
 * There is no `pageSize`: the field is deprecated in `SearchGoogleAdsRequest`
 * and Google answers `PAGE_SIZE_NOT_SUPPORTED` when it is sent. Bound the
 * result with GAQL's own `LIMIT` and page with `pageToken`.
 */
const search: ActionDefinition<Input> = {
  key: "search",
  type: "search",
  resource: "googleAds",
  title: "Run GAQL Query",
  description:
    "Run a raw Google Ads Query Language statement and return one page of rows. The general-purpose read for anything the typed actions don't cover.",
  params: [
    {
      key: "query",
      label: "GAQL query",
      type: "code",
      required: true,
      placeholder:
        "SELECT campaign.id, campaign.name, metrics.impressions FROM campaign WHERE segments.date DURING LAST_30_DAYS",
      hint: "Field paths are snake_case. One resource per FROM; GAQL has no joins.",
    },
    customerId,
    pageToken,
    {
      key: "validateOnly",
      label: "Validate only",
      type: "boolean",
      hint: "Check the query server-side and return errors without running it.",
    },
    {
      key: "returnTotalResultsCount",
      label: "Return total results count",
      type: "boolean",
      hint: "Include the total number of matching rows, ignoring LIMIT.",
    },
    {
      key: "returnSummaryRow",
      label: "Return summary row",
      type: "boolean",
      hint: "Include a totals row for the selected metrics.",
    },
  ],
  output: [
    ...searchOutput,
    { key: "summaryRow", type: "object", label: "Summary row" },
  ],

  execute(input, ctx) {
    const client = new GoogleAdsClient(ctx);
    return client.search(client.customerId(input.customerId), {
      query: input.query,
      pageToken: input.pageToken,
      validateOnly: input.validateOnly,
      searchSettings: {
        returnTotalResultsCount: input.returnTotalResultsCount,
        returnSummaryRow: input.returnSummaryRow,
      },
    });
  },
};

export default search;
