/**
 * Is Quickbase up? — StatusCast, at `quickbasestatus.status.page`.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — answers "is the vendor's platform up", a different
 *     question from "is this credential live" (the derived `auth:*` check) or
 *     "is there quota left" (`quota`).
 *   - `scope: "app"` (this kind's default) — the answer is identical for every
 *     Connection, so the host runs it once and shares it. Per-Connection would
 *     multiply one useful call by the number of users and is a good way to get
 *     rate-limited by a status page.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` — the status host is deliberately NOT on the app's egress
 *     allowlist, which is `api.quickbase.com` + `api.quickbase.eu` and nothing
 *     else. An Action has no business calling a status page. The allowlist is
 *     widened for this one hook, which the spec permits precisely because the
 *     posture is unsigned: a signed request must never reach a status host.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 *
 * ## Finding the status page at all — three hosts that are not it
 *
 * The obvious guess is wrong, and so are the next two. All checked 2026-08-03:
 *
 *   - **`status.quickbase.com`** is not a status page. It 301s to
 *     `/db/main` — a *Quickbase application URL* — and that page renders
 *     Quickbase's own error: "You've requested a page using an invalid
 *     hostname: status.quickbase.com". The `<title>` is literally
 *     "Quickbase Error". Probing it would have produced a check that reports on
 *     a misconfigured vhost.
 *   - **`quickbase.statuspage.io`** — the unclaimed-Atlassian-subdomain trap.
 *     `GET /api/v2/summary.json` answers **302 to `https://www.statuspage.io/`**,
 *     discarding the path. There is no Quickbase page behind it.
 *   - **`service.quickbase.com`** *is* Quickbase's canonical status host — the
 *     RSS feed below self-identifies as `https://service.quickbase.com/rss` —
 *     but it answers **403 `Invalid request blocked (v1)`** (28 bytes of
 *     `text/html`) to every path, root included, from a datacenter address. A
 *     WAF that blocks the caller is not a signal about the vendor, so it cannot
 *     be the probe.
 *
 * `quickbasestatus.status.page` is the same StatusCast instance, reachable.
 *
 * ## Verifying the endpoint is real before probing it
 *
 * A JSON-shaped path returning 200 proves nothing — a host with an HTML
 * catch-all returns 200 for everything, and probing one yields a permanently
 * cheerful check that means nothing. Both required checks were run:
 *
 *   (a) **Bogus sibling paths, for comparison.** This host *does* have a
 *       catch-all: `/zzz-bogus-control`, `/api/status`, `/api/v2/summary.json`,
 *       `/atom`, `/index.json` and `/history.rss` all return the SAME 1 034-byte
 *       `text/html` page ("Oops Something Went Tragically Wrong"), md5
 *       `4c4596fb…`. Against that baseline exactly two paths are different
 *       responses rather than the catch-all:
 *         `GET /status.json` -> 200, `application/json`, 183 bytes
 *         `GET /rss`         -> 200, `application/xml`, 39 460 bytes
 *       and three invented near-misses (`/status2.json`, `/statuss.json`,
 *       `/state.json`) return **302 with zero bytes** — a third distinct
 *       behaviour. So `/status.json` is a route, not a fallback.
 *
 *   (b) **Content-type and body.** `application/json`, not `text/html`, and the
 *       body is live and self-consistent:
 *         {"InEffectSince":"2026-08-03T10:41:00",
 *          "InEffectSinceText":"Current status in effect for 0 days, 9 hours, …",
 *          "StatusText":"Normal","Status":"Available"}
 *       The `/rss` sibling carries 38 real, dated Quickbase incidents
 *       (e.g. "[Quickbase Status] Notice: Service Functionality Degraded
 *       (Planned)" concerning US/EU billing) and self-links to
 *       `service.quickbase.com` — which is what ties this StatusCast tenant to
 *       Quickbase rather than to a squatter.
 *
 * ## Why `/status.json` over the feed
 *
 * `/status.json` states CURRENT state directly in one small request; an RSS
 * feed is a log of updates that has to be folded back into state, and folding
 * it wrong is how a check ends up reporting a resolved incident from March.
 * The feed remains the better fallback if StatusCast ever drops the JSON route.
 *
 * ## The one thing this check does NOT claim
 *
 * StatusCast publishes no public dictionary of `Status` values, and the only
 * value observed on the wire is `"Available"`. So the mapping below is
 * deliberately shallow: `Available` means `ok`, anything else means "not
 * normal" and is reported as `degraded` with the vendor's own `StatusText` as
 * the message. It does **not** pretend to tell a partial degradation from a
 * full outage, because nothing observed or documented supports that
 * distinction. A guessed vocabulary that mapped an unseen string to `down`
 * would be a fabricated verdict, and `degraded` is already this kind's severity
 * ceiling — so the conservative reading costs an operator nothing while the
 * invented one could raise a false outage.
 *
 * There are no `components`: this endpoint reports a single realm-wide rollup
 * and nothing per-service, so inventing component keys would be reporting
 * detail the probe never received.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const STATUS_HOST = "quickbasestatus.status.page";

/** The only `Status` value observed on the wire (2026-08-03). */
const HEALTHY = "available";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Quickbase platform status",
  description:
    "StatusCast rollup for Quickbase, read from quickbasestatus.status.page/status.json. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/status.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status endpoint returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      Status?: string;
      StatusText?: string;
      InEffectSince?: string;
    };

    const status = body.Status?.trim();
    if (!status) {
      return { state: "unknown", message: "status endpoint returned no Status field" };
    }

    const ok = status.toLowerCase() === HEALTHY;
    return {
      state: ok ? "ok" : "degraded",
      // StatusText is the vendor's own prose ("Normal"); fall back to the
      // machine value so the message is never empty.
      message: body.StatusText?.trim() || status,
      ttlSeconds: 60,
    };
  },
};

export default service;
