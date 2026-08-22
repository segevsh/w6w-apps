/**
 * There is nothing to read. This says so, rather than leaving a gap.
 *
 * Pinecone meters heavily — but none of it is legible to a client:
 *
 *   - **No rate-limit headers.** Measured 2026-08-18 against
 *     `api.pinecone.io`, a response carries `x-pinecone-api-version` and
 *     Google Frontend's own headers, and nothing resembling
 *     `x-ratelimit-*`. Exceeding a limit answers `429` and that is the entire
 *     signal.
 *   - **No usage endpoint on this API.** The read/write unit balance that
 *     Starter (1M read / 2M write units a month) and Builder (2M / 5M) are
 *     billed against lives in the console. `db_control`, `db_data` and
 *     `inference` publish no operation that returns it, and the Admin API —
 *     which does manage projects — authenticates with a service account
 *     through OAuth client credentials, a different credential this app does
 *     not hold.
 *   - **The limits that do exist are per-namespace and per-index, not per
 *     key**: 100 requests/second each for query, upsert, delete and update per
 *     namespace; 50 MB/s of upsert per namespace; 2,000 read units/second per
 *     index; 5,000 deletes/second; 100 fetches/second; 200 lists/second. A
 *     single number for "the connection" would be a fiction.
 *
 * Inventing a probe would mean spending write units to measure write units. A
 * check that is confidently wrong is worse than no check, so this app ships an
 * explicit absence with the reason attached.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Pinecone exposes no quota to a client. Verified 2026-08-18: responses from " +
      "api.pinecone.io carry no x-ratelimit-* headers of any kind — a limit breach is a bare " +
      "429 — and the db_control, db_data and inference specs publish no usage or balance " +
      "operation, so the monthly read/write unit consumption that Starter and Builder plans " +
      "are metered against is only visible in the console. The Admin API that could report it " +
      "authenticates with an OAuth service account rather than an API key. Pinecone's " +
      "published limits are also per-namespace and per-index (100 rps each for query, upsert, " +
      "delete and update per namespace; 2,000 read units/second per index), so no single " +
      "number describes a connection's headroom.",
  },
};

export default quota;
