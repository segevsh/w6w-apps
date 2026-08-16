import type { ActionDefinition } from "@w6w/types";
import { bareId, encodeUrn, LinkedInAdsClient, sponsoredCreativeUrn } from "../lib/client.ts";
import { accountIdParam, creativeIdParam } from "../lib/params.ts";

interface Input {
  accountId: string;
  creativeId: string;
}

/**
 * `GET /rest/adAccounts/{accountId}/creatives/{creative URN, url-encoded}` —
 * unlike Ad Accounts/Campaign Groups/Campaigns, a Creative is addressed by
 * its **full URN** in the path, percent-encoded (`urn%3Ali%3AsponsoredCreative%3A...`),
 * not a bare numeric id.
 */
const creativeGet: ActionDefinition<Input> = {
  key: "creative-get",
  type: "read",
  resource: "creative",
  title: "Get Creative",
  description: "Fetch one Creative by its URN.",
  params: [accountIdParam, creativeIdParam],
  output: [
    { key: "id", type: "string", label: "Creative URN" },
    { key: "campaign", type: "string", label: "Campaign URN" },
    { key: "intendedStatus", type: "string", label: "Intended status" },
    { key: "isServing", type: "boolean", label: "Currently serving" },
    { key: "content", type: "object", label: "Content" },
  ],

  execute(input, ctx) {
    const client = new LinkedInAdsClient(ctx);
    return client.request(
      `/rest/adAccounts/${bareId(input.accountId)}/creatives/${
        encodeUrn(sponsoredCreativeUrn(input.creativeId))
      }`,
    );
  },
};

export default creativeGet;
