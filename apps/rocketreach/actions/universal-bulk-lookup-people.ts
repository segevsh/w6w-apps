import type { ActionDefinition, Param } from "@w6w/types";
import { parseJsonParam, RocketReachClient } from "../lib/client.ts";
import { BULK_OUTPUT, BULK_PARAMS, bulkBody } from "../lib/profile.ts";

type Input = Record<string, unknown>;

/**
 * `POST /universal/person/bulk_lookup` — Universal Credits accounts only, up to
 * 100 lookups. Each query may carry its own `reveal_*` flags (see Universal Lookup
 * Person); a query without them reveals nothing.
 */
const params: Param[] = BULK_PARAMS.map((p) =>
  p.key === "queries"
    ? {
      ...p,
      hint: "JSON array of 1-100 lookups, each identifying a person and choosing what to reveal: " +
        '[{"linkedin_url":"https://www.linkedin.com/in/benioff","reveal_professional_email":true}]. ' +
        "Flags: reveal_professional_email, reveal_personal_email, reveal_phone, " +
        "reveal_detailed_person_enrichment, reveal_healthcare_enrichment.",
    }
    : p
);

const universalBulkLookupPeople: ActionDefinition<Input> = {
  key: "universal-bulk-lookup-people",
  type: "perform",
  idempotent: false,
  resource: "person",
  title: "Universal Bulk Lookup People",
  description: "Universal Credits version of Bulk Lookup People: start lookups for up to 100 " +
    "people, each with its own reveal flags. Results go to your webhook, or are fetched with " +
    "Universal Check Lookup Status.",
  params,
  output: BULK_OUTPUT,

  async execute(input, ctx) {
    const { body, count } = bulkBody(input, parseJsonParam);
    const res = await new RocketReachClient(ctx).request("/universal/person/bulk_lookup", {
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

export default universalBulkLookupPeople;
