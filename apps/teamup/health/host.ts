import type { HealthCheckDefinition } from "@w6w/types";
import { PROBE_PATH } from "../auth/token.ts";
import { API_BASE, API_PREFIX, readTeamUpError } from "../lib/client.ts";

/**
 * Is the TeamUp API host answering?
 *
 * ## Why there is no `service` check in this app
 *
 * TeamUp *has* a status page (`https://status.goteamup.com/`) and it is a real
 * Atlassian Statuspage — `page.name` is literally "TeamUp". It is not wired
 * here, deliberately, on two pieces of evidence read on 2026-09-22:
 *
 *  1. Its TLS certificate (`CN=status.goteamup.com`, genuinely issued by Let's
 *     Encrypt for this domain) **expired 2026-06-06** and was never renewed.
 *  2. Its components are literally named `API (example)` and
 *     `Management Portal (example)` — the unedited default template Atlassian
 *     ships for a brand-new Statuspage, never renamed to real product names.
 *
 * Together those say the page was created once and abandoned, not that it is a
 * trustworthy operational signal. A check that reads it would mostly report on
 * Atlassian's template rather than on TeamUp, so the absence is declared — in
 * this app's README and in the pack's `HEALTHCHECKS.md` index — instead of
 * being probed, the same call this pack makes for other placeholder status
 * pages.
 *
 * ## What this check is
 *
 * `kind: "dependency"` — the third question a host asks: is this app's own
 * dependency reachable, as opposed to "is the credential live" (the derived
 * `auth:token` check). TeamUp gives no unauthenticated health endpoint, so the
 * probe is the documented `GET /api/v2/auth/profiles` **sent without a
 * credential**. A `401`/`403` is therefore a *pass*: it proves the host
 * resolves, TLS terminates, and the documented API answers behind its
 * credential gate. Reading that as a failure would report every healthy
 * TeamUp as broken, and it would double-count exactly the problem the
 * `auth:token` check exists to name.
 *
 * ## Annotation, and why each axis is what it is
 *
 *  - `scope: "app"` — there is one host (`goteamup.com`) for every Connection,
 *    so one probe answers for all of them.
 *  - `credential: "none"` — the probe is unsigned; `sign` never runs, so the
 *    credential cannot leak to a probe whose only job is reachability.
 *  - `severity: "informational"` — a reachability signal is evidence, not a
 *    verdict on a workflow: the outage it reports may fall outside the subset
 *    of the API one connection uses. Tagged so it can never worsen a roll-up
 *    on its own.
 *  - `network.allow` is the app's own allowlist (`goteamup.com`), declared so
 *    this unsigned probe's egress is explicit rather than inherited.
 *
 * The path is `auth/token.ts`'s own probe constant on purpose: it is the same
 * documented endpoint in the other posture. The credential check asks "is this
 * token good?", this asks "did the host answer?", and one constant keeps the two
 * from drifting apart.
 */
export const HOST_PROBE_PATH = `${API_PREFIX}${PROBE_PATH}`;

const host: HealthCheckDefinition = {
  key: "host",
  title: "TeamUp API host reachable",
  description:
    "Unauthenticated request to the documented API on goteamup.com. A 401/403 is a pass — it " +
    "proves the host is serving; credential validity is the `auth:token` check's question. " +
    "TeamUp's own status page is abandoned (expired certificate, untouched template component " +
    "names), so there is no `service` check in this app.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,
  network: { allow: ["goteamup.com"] },

  async check(_input, ctx) {
    const url = `${API_BASE}${HOST_PROBE_PATH}`;
    const started = Date.now();
    let res: Response;
    try {
      res = await ctx.fetch(url, { headers: { accept: "application/json" } });
    } catch (err) {
      // Nothing answered at the origin: DNS, TLS or transport.
      return {
        state: "down",
        message: `could not reach ${API_BASE}: ${String(err)}`,
        latencyMs: Date.now() - started,
      };
    }
    const latencyMs = Date.now() - started;
    const body = await res.text().catch(() => "");

    if (res.status >= 500) {
      return {
        state: "down",
        message: `goteamup.com answered ${res.status} for the API`,
        latencyMs,
      };
    }

    // The credential gate answered, which is the whole question this check asks.
    if (res.status === 401 || res.status === 403) {
      const { code } = readTeamUpError(body);
      return {
        state: "ok",
        message: `the API is serving — it answered ${res.status}` +
          `${code ? ` (code ${code})` : ""} to an unsigned request, which is TeamUp refusing an ` +
          "anonymous caller rather than a problem with the host",
        latencyMs,
      };
    }

    if (res.status === 404) {
      return {
        state: "degraded",
        message:
          "something answered at goteamup.com but not the documented API path — the API may " +
          "have moved or the request may be reaching an edge page",
        latencyMs,
      };
    }

    if (res.ok) {
      return {
        state: "ok",
        message: `the API answered ${res.status} in ${latencyMs}ms`,
        latencyMs,
      };
    }

    return {
      state: "degraded",
      message: `goteamup.com answered ${res.status} for the API`,
      latencyMs,
    };
  },
};

export default host;
