/**
 * Do we have quota left? — not knowable, declared as a positive fact.
 *
 * Account Engagement does cap daily API calls (error-codes page: "Daily API rate limit met"),
 * and the Version 5 Overview says a request sent with `X-Return-Api-Usage: 1` gets an
 * `x-api-usage` response header: "the number of API calls made in the last day over the
 * maximum calls the account can make per day". The overview does not give that header's
 * wire format, and there is no usage endpoint, so there is nothing to parse without
 * guessing — and a guessed parse would report a headroom figure the vendor never promised.
 *
 * `severity: "informational"` is required, not stylistic: an `unavailable` entry always
 * reports `unknown`, which would otherwise pin the app's verdict there permanently.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Daily API call headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Account Engagement caps daily API calls and returns an x-api-usage header on request, " +
      "but documents neither the header's format nor a usage endpoint; exhaustion only shows " +
      "up as a 'Daily API rate limit met' error.",
  },
};

export default quota;
