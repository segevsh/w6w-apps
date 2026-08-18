import type { HealthCheckDefinition } from "@w6w/types";
import {
  accountFromConnection,
  type GraphQLResponse,
  regionFromConnection,
  REGIONS,
} from "../lib/client.ts";

/**
 * Is anything still sending New Relic data?
 *
 * ## Monitoring that has stopped monitoring looks exactly like everything being fine
 *
 * This is the failure worth checking for on an observability vendor
 * specifically. If an agent stops, a host is decommissioned, or an ingest key
 * is rotated and not updated, New Relic does not complain — it simply has no
 * data, and every dashboard goes quiet. Quiet is what "healthy" looks like.
 *
 * Worse, alert conditions on a service that stopped reporting evaluate against
 * *no data* and therefore never fire, unless somebody explicitly configured
 * them to open an incident on expiration. So an outage in the telemetry
 * pipeline silently disables the alerting that would have caught it. That
 * compound failure is the reason this check exists.
 *
 * ## What it measures
 *
 * The proportion of the account's entities with `reporting: false`. An entity
 * that stops sending stays searchable for about eight days, so this is a moving
 * picture rather than a snapshot — a handful is normal churn as things are
 * decommissioned, and a large fraction is a pipeline that has fallen over.
 *
 * `severity: "informational"` because it is a statement about the account's
 * telemetry rather than about whether the API works — and because an account
 * mid-migration can legitimately look terrible.
 */
const reporting: HealthCheckDefinition = {
  key: "reporting",
  title: "Entities reporting",
  description:
    "What proportion of this account's entities have stopped sending data. Monitoring that has " +
    "gone quiet looks identical to everything being fine — and silences the alerts that would " +
    "have caught it.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  severity: "informational",
  minIntervalSeconds: 900,

  async check(_input, ctx) {
    const account = accountFromConnection(ctx.connection);
    if (!account) {
      return {
        state: "unknown",
        message: "this connection records no default account, so there is nothing to measure — " +
          "reconnect it with one, or use `entity-search` per account instead",
      };
    }
    const endpoint = REGIONS[regionFromConnection(ctx.connection)];

    let res: Response;
    try {
      res = await ctx.fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          query:
            `query($query: String!) { actor { entitySearch(query: $query) { count results { entities { guid reporting domain } } } } }`,
          variables: { query: `accountId = ${account}` },
        }),
      });
    } catch (err) {
      return { state: "down", message: `could not reach NerdGraph: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");

    if (res.status === 401 || res.status === 403) {
      // The derived auth check owns credential failures.
      return { state: "unknown", message: "the user key was rejected" };
    }
    if (!res.ok) return { state: "down", message: `NerdGraph answered ${res.status}` };

    interface SearchData {
      actor?: {
        entitySearch?: {
          count?: number;
          results?: { entities?: Array<{ reporting?: boolean; domain?: string }> };
        };
      };
    }
    let body: GraphQLResponse<SearchData> | null = null;
    try {
      body = JSON.parse(text) as GraphQLResponse<SearchData>;
    } catch {
      return { state: "unknown", message: "NerdGraph did not return JSON" };
    }
    // GraphQL puts its failures in a 200.
    if (body?.errors?.length) {
      return {
        state: "unknown",
        message: body.errors.map((error) => error.message ?? "error").join("; "),
      };
    }

    const search = body?.data?.actor?.entitySearch;
    const entities = search?.results?.entities ?? [];
    if (entities.length === 0) {
      return {
        state: "degraded",
        message: `account ${account} has no entities at all — correct for a new account, and ` +
          "also what an account whose agents all stopped looks like after eight days",
      };
    }

    const quiet = entities.filter((entity) => entity?.reporting === false);
    const proportion = quiet.length / entities.length;

    // Which domains, because that points at what stopped.
    const byDomain = new Map<string, number>();
    for (const entity of quiet) {
      const domain = String(entity?.domain ?? "unknown");
      byDomain.set(domain, (byDomain.get(domain) ?? 0) + 1);
    }
    const worst = [...byDomain.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([domain, count]) => `${domain} (${count})`).join(", ");
    const detail = `${quiet.length} of ${entities.length} entities not reporting` +
      (worst ? ` — ${worst}` : "");

    if (quiet.length === 0) {
      return {
        state: "ok",
        message: `all ${entities.length} entities in account ${account} are reporting`,
        ttlSeconds: 900,
      };
    }
    if (proportion >= 0.5) {
      return {
        state: "down",
        message: `${detail}. At this proportion the telemetry pipeline has stopped, which also ` +
          "means alert conditions on those entities are evaluating against no data and will not " +
          "fire",
        ttlSeconds: 900,
      };
    }
    if (proportion >= 0.15) {
      return { state: "degraded", message: detail, ttlSeconds: 900 };
    }
    return {
      state: "ok",
      message: `${detail}, which is within normal decommissioning churn`,
      ttlSeconds: 900,
    };
  },
};

export default reporting;
