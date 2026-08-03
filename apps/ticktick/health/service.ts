/**
 * Is TickTick up? — an unsigned probe of the API's own authentication gate,
 * because TickTick publishes no status page at all.
 *
 * ## Every status-page candidate, and what it actually returned
 *
 * All probed on the wire 2026-08-03. Both tests the pack requires were applied
 * to each survivor: **(a)** a deliberately bogus sibling path on the same host —
 * identical bytes means a catch-all, not an API; **(b)** content-type *and*
 * body — HTML served for a `.json` path means a fake.
 *
 *   | Candidate                                    | Result                                                                                          |
 *   | -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
 *   | `status.ticktick.com`                        | **NXDOMAIN.** Does not resolve. There is no status subdomain.                                    |
 *   | `ticktick.statuspage.io/`                    | `200 text/html`, **127,720 bytes**, after redirecting to `https://www.atlassian.com/software/statuspage`. |
 *   | `ticktick.statuspage.io/api/v2/status.json`  | The **same 127,720 bytes**, md5 `8d3c480a2267…` — byte-identical to the root. Fails test (a) *and* test (b): an unclaimed Atlassian subdomain serving marketing HTML for a `.json` path. |
 *   | `ticktick.instatus.com`                      | `200 text/html`, 216,836 bytes, after redirecting to `https://instatus.com/` — the same unclaimed-subdomain trap in Instatus's colours. |
 *   | `status.dida365.com`                         | **NXDOMAIN.** (`dida365.com` is TickTick's China edition; the Open API documents only `api.ticktick.com`.) |
 *   | `ticktick.status.io`, `ticktickstatus.com`   | **NXDOMAIN.**                                                                                    |
 *
 * The `ticktick.statuspage.io` row is the classic trap, hit exactly as
 * described: a naive "did it 200?" check pointed there would report TickTick
 * healthy forever while parsing Atlassian's product page.
 *
 * ## What is probed instead, and why it is real
 *
 * `GET https://api.ticktick.com/open/v1/project` **with no `Authorization`
 * header**. TickTick's own API tier answers, on the wire:
 *
 * ```
 * HTTP/2 401
 * content-type: application/json
 * cache-control: no-store
 * {"error":"unauthorized","error_description":"Full authentication is required to access this resource","errors":[{"message":"…"}]}
 * ```
 *
 * That `401` is the *healthy* answer: it proves the exact host every action
 * calls is serving, is running its OAuth filter, and is returning its documented
 * JSON error envelope rather than a load-balancer error page. It is
 * side-effect-free, costs one request, and needs no credential — this is the
 * `postbin` App's "narrowest honest probe" precedent applied to an API whose
 * every route requires auth.
 *
 * **What this probe deliberately does not claim.** A bogus sibling
 * (`/open/v1/bogus-nonexistent`) returns byte-identical `401` output, because
 * the OAuth filter runs *before* routing. So this cannot confirm that any
 * particular endpoint exists — only that the service and its auth tier are
 * alive. That limitation is the reason the check reports `ok`, never anything
 * stronger, and it is stated in the README rather than papered over.
 *
 * ## Posture and severity
 *
 *   - `kind: "service"` — "is the vendor's platform up", a different question
 *     from "is this credential live" (the derived `auth:oauth2` check) or "is
 *     there quota left" (`quota`).
 *   - `scope: "app"` (this kind's default) — the answer is identical for every
 *     Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — and here that is not incidental
 *     but the entire mechanism: the probe *works* precisely because it is
 *     unsigned. `sign` never runs, so no token can leak into it, and the check
 *     reports before anyone has connected.
 *   - `network.allow` is `api.ticktick.com` — the App's own host, already on the
 *     manifest allowlist. It is restated here so a reader of the manifest can
 *     see that this hook widens nothing.
 *   - **Severity is left at the `degraded` default, deliberately.** The sibling
 *     `discourse` App downgrades its live service check to `informational`
 *     because its status page speaks only for Discourse's *hosting business* and
 *     says nothing about a self-hosted forum — the signal does not apply to
 *     every tenant. That reasoning does not transfer: TickTick is
 *     single-tenant SaaS on one documented host, every Connection in this App
 *     talks to `api.ticktick.com`, and this probe hits that host directly. When
 *     it says `down`, it is down for everyone, and `degraded` is the truthful
 *     weight. (`degraded` still never hard-fails a target on its own.)
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/** TickTick's documented error envelope, as it appears unauthenticated. */
interface ErrorEnvelope {
  error?: string;
  error_description?: string;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "TickTick API reachable",
  description:
    "Unsigned GET of api.ticktick.com/open/v1/project. TickTick publishes no status page — no status.ticktick.com, and ticktick.statuspage.io is an unclaimed Atlassian subdomain — so the honest probe is the API's own auth gate: a 401 with the documented JSON error envelope proves the service is serving.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["api.ticktick.com"] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/project`, {
      headers: { accept: "application/json" },
    });

    // 5xx is the one answer that means TickTick itself is broken.
    if (res.status >= 500) {
      return { state: "down", message: `api.ticktick.com returned ${res.status}`, ttlSeconds: 120 };
    }

    // The expected healthy answer. Guard the *shape*, not just the code: an
    // edge device can produce a 401 of its own with an HTML body, and that is
    // not evidence the API tier is alive.
    if (res.status === 401) {
      const type = res.headers.get("content-type") ?? "";
      if (!type.includes("json")) {
        return {
          state: "unknown",
          message: `401 carried ${type || "no content-type"}, not the documented JSON envelope`,
          ttlSeconds: 120,
        };
      }
      const body = await res.json().catch(() => null) as ErrorEnvelope | null;
      if (!body || typeof body.error !== "string") {
        return { state: "unknown", message: "401 body was not TickTick's error envelope" };
      }
      return { state: "ok", message: `auth gate responding (${body.error})`, ttlSeconds: 120 };
    }

    // A 200 here would mean the endpoint stopped requiring authentication,
    // which is a bigger surprise than an outage — report it as unknown rather
    // than quietly calling it healthy.
    if (res.ok) {
      return {
        state: "unknown",
        message: `unauthenticated GET /project returned ${res.status}; expected 401`,
        ttlSeconds: 120,
      };
    }

    // 4xx that is not 401 (403 from a WAF, 429 from an edge rate limiter):
    // says something about this caller, not about TickTick.
    return {
      state: "unknown",
      message: `api.ticktick.com returned ${res.status}`,
      ttlSeconds: 120,
    };
  },
};

export default service;
