/**
 * Is the API version this connection pins still supported?
 *
 * This check exists because Snyk's API is date-versioned in a way no other app
 * in this pack is: `version` is a **required** query parameter on 253 of the
 * document's 290 operations, a Connection pins a date, and Snyk moves versions
 * through a lifecycle and eventually stops serving them. A pinned version going
 * stale is a real, scheduled outage for this app — and it is invisible until
 * calls start failing.
 *
 * Snyk publishes exactly the headers needed to see it coming. From the API
 * document's own `components.headers`, its declared response headers are
 * `snyk-request-id`, **`snyk-version-requested`**, **`snyk-version-served`**,
 * **`snyk-version-lifecycle-stage`**, **`deprecation`**, **`sunset`**,
 * `retry-after`, `content-location` and `location`.
 *
 * Two conditions this reports that nothing else would:
 *
 *   - **Served ≠ requested.** Snyk resolves an unknown or retired date to the
 *     nearest supported one and says so. The calls keep working, and the
 *     response shapes may not be the ones this app was built against.
 *   - **Deprecated or sunset.** `snyk-version-lifecycle-stage` names the stage,
 *     and `sunset` carries the date after which the version stops being served.
 *
 * Annotation:
 *
 *   - `kind: "dependency"` — this app depends on a pinned version continuing to
 *     be served. It is not the vendor being down, not the credential, and not
 *     quota.
 *   - `scope: "connection"` — each Connection can pin its own version, so there
 *     is no shareable app-wide answer.
 *   - `credential: "signed"` — an unauthenticated call answers 401 before the
 *     version headers are worth reading (verified 2026-08-18). No
 *     `network.allow` is declared, which the spec requires alongside a signed
 *     posture.
 *   - `severity: "degraded"` (the default for this kind). A deprecation is a
 *     deadline, not an outage.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL, resolveVersion } from "../lib/client.ts";

const apiVersion: HealthCheckDefinition = {
  key: "api-version",
  title: "Pinned API version still served",
  description:
    "Reads Snyk's `snyk-version-served`, `snyk-version-lifecycle-stage` and `sunset` headers " +
    "to catch a pinned date going stale before calls start failing.",
  kind: "dependency",
  scope: "connection",
  covers: ["*"],
  minIntervalSeconds: 3600,

  async check(_input, ctx) {
    const requested = resolveVersion(ctx.connection);
    const res = await ctx.fetch(`${API_URL}/self?version=${encodeURIComponent(requested)}`, {
      headers: { accept: "application/vnd.api+json" },
    });
    if (!res.ok) {
      return { state: "unknown", message: `version probe returned ${res.status}` };
    }

    const served = res.headers.get("snyk-version-served") ?? undefined;
    const stage = res.headers.get("snyk-version-lifecycle-stage") ?? undefined;
    const sunset = res.headers.get("sunset") ?? undefined;
    const deprecation = res.headers.get("deprecation") ?? undefined;

    if (!served && !stage) {
      return {
        state: "unknown",
        message: "response carried no snyk-version-* headers",
        ttlSeconds: 3600,
      };
    }

    const notes: string[] = [];
    if (served && served !== requested) {
      notes.push(`Snyk served ${served} for the pinned ${requested}`);
    }
    if (stage && stage !== "ga" && stage !== "GA") notes.push(`lifecycle stage: ${stage}`);
    if (deprecation) notes.push(`deprecated: ${deprecation}`);
    if (sunset) notes.push(`sunset: ${sunset}`);

    if (notes.length === 0) {
      return { state: "ok", message: `version ${requested} is current`, ttlSeconds: 3600 };
    }
    // A deadline, not an outage — `degraded` so it shows without failing a
    // target that is still working.
    return { state: "degraded", message: notes.join("; "), ttlSeconds: 3600 };
  },
};

export default apiVersion;
