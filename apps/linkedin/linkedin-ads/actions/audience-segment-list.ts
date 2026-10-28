import type { ActionDefinition } from "@w6w/types";
import { compact, LinkedInAdsClient, sponsoredAccountUrn } from "../lib/client.ts";
import { accountIdParam, dmpSourcePlatformOptions } from "../lib/params.ts";

interface Input {
  accountId: string;
  sourcePlatform?: string;
  sourceSegmentId?: string;
  start?: number;
  count?: number;
}

/**
 * `GET /rest/dmpSegments?q=account&account=...` — the only documented finder
 * for DMP segments, so unlike the other list actions in this app, an Ad
 * Account is required rather than one optional filter among several. Add
 * `sourcePlatform`/`sourceSegmentId` for more granular results.
 *
 * Index-paginated (`start`/`count`, `paging.total`) — the older shape, not
 * the cursor `pageSize`/`pageToken` the Ad Account/Campaign Group/Campaign/
 * Creative searches use. See `lib/client.ts` for why this app doesn't
 * normalise the two.
 */
const audienceSegmentList: ActionDefinition<Input> = {
  key: "audience-segment-list",
  type: "search",
  resource: "audience-segment",
  title: "List Audience Segments",
  description: "Find Matched Audiences (DMP) segments belonging to an Ad Account.",
  params: [
    accountIdParam,
    {
      key: "sourcePlatform",
      label: "Source platform",
      type: "select",
      options: dmpSourcePlatformOptions,
      advanced: true,
    },
    { key: "sourceSegmentId", label: "Source segment ID", type: "string", advanced: true },
    { key: "start", label: "Start (offset)", type: "number", default: 0 },
    { key: "count", label: "Count", type: "number", default: 10, hint: "Page size." },
  ],
  output: [
    { key: "elements", type: "array", label: "Segments" },
    { key: "paging", type: "object", label: "Paging (start/count/total)" },
  ],

  execute(input, ctx) {
    const client = new LinkedInAdsClient(ctx);
    return client.request("/rest/dmpSegments", {
      query: {
        q: "account",
        account: sponsoredAccountUrn(input.accountId),
        start: String(input.start ?? 0),
        count: String(input.count ?? 10),
        ...compact({
          sourcePlatform: input.sourcePlatform,
          sourceSegmentId: input.sourceSegmentId,
        }),
      },
    });
  },
};

export default audienceSegmentList;
