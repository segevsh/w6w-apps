import type { ActionDefinition } from "@w6w/types";
import { parseJsonParam, RocketReachClient } from "../lib/client.ts";
import { BULK_OUTPUT, BULK_PARAMS, bulkBody } from "../lib/profile.ts";

type Input = Record<string, unknown>;

/**
 * `POST /bulkLookup` — up to 100 lookups per request. The vendor answers 200
 * "bulk lookup request accepted" with an `RR-Request-ID` header (the same id is
 * sent with the webhook delivery) and no documented body: the data arrives at the
 * webhook, or is polled with Check Lookup Status once the profile ids are known.
 * Bulk jobs are rate limited separately (10/min, 25/hour, 100/day on standard plans).
 */
const bulkLookupPeople: ActionDefinition<Input> = {
  key: "bulk-lookup-people",
  type: "perform",
  idempotent: false,
  resource: "person",
  title: "Bulk Lookup People",
  description: "Start lookups for up to 100 people in one request. Results are not returned " +
    "here: they are posted to your webhook, or fetched with Check Lookup Status using the " +
    "profile IDs. Submitted profiles are added to a RocketReach profile list. For Universal " +
    "Credits accounts use Universal Bulk Lookup People.",
  params: BULK_PARAMS,
  output: BULK_OUTPUT,

  async execute(input, ctx) {
    const { body, count } = bulkBody(input, parseJsonParam);
    const res = await new RocketReachClient(ctx).request("/bulkLookup", {
      method: "POST",
      body,
    });
    return {
      accepted: true,
      queries: count,
      requestId: res.headers.get("rr-request-id") ?? null,
      response: res.body ?? null,
    };
  },
};

export default bulkLookupPeople;
