/**
 * Is this Connection's forum reachable, and is it actually serving Discourse?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — not `service`. For a self-hosted forum there is no
 *     vendor platform to be up or down: the forum IS the dependency, and its
 *     availability is a property of the customer's own infrastructure. The
 *     `service` check covers Discourse's hosting business separately, and is
 *     informational precisely because it says nothing about this forum.
 *   - `scope: "connection"` — every Connection points at a different forum, so
 *     there is no shareable app-wide answer.
 *   - `credential: "context"` — the posture a boolean would lose. This check
 *     needs the Connection to know WHICH host to call, and needs no credential
 *     to interpret the answer. `sign` must not run.
 *   - No `network.allow` is declared: the forum is already reachable under the
 *     App's own `["*"]` allowlist, and a `context` check is unsigned regardless.
 *   - `severity` stays at the `degraded` default for this kind. A forum being
 *     gone is arguably fatal, but the derived `auth:api-key` check already
 *     covers the case where the credential stops working, so this one is the
 *     advisory half of the pair.
 *
 * ## Why `GET /site/basic-info.json` and not the obvious alternatives
 *
 * The probe has to work **unauthenticated and on every forum**, including the
 * private ones. That rules out most of the candidates:
 *
 *  - `/site.json` — the full site payload, but it is rendered through the
 *    request's `guardian`, so a `login_required` forum answers 403 to anonymous
 *    callers. A perfectly healthy private forum would report as broken.
 *  - `/categories.json`, `/latest.json` — same problem, plus they are real
 *    queries against the database and cost far more than a liveness probe should.
 *  - `/srv/status` — Discourse's own load-balancer liveness route. It works
 *    (verified: 200, `text/plain`, the two bytes `ok`), but it proves only that
 *    Rails is answering. It returns no identity, says nothing about whether the
 *    JSON API is being served, and is commonly rewritten or blocked at the
 *    reverse proxy on self-hosted installs — so a 404 there is ambiguous
 *    between "forum down" and "ops team locked the path down".
 *
 * `/site/basic-info.json` is the one endpoint Discourse explicitly exempts from
 * the login gate. `app/controllers/site_controller.rb`:
 *
 *     skip_before_action :redirect_to_login_if_required,
 *                        :redirect_to_profile_if_required,
 *                        only: %w[basic_info statistics]
 *     …
 *     # this info is always available cause it can be scraped from a 404 page
 *
 * It returns the forum's `title`, `description`, logo URLs, `locale` and
 * `login_required` flag — enough to prove the host resolves, that Discourse is
 * what is answering on it, and that the JSON API is being served. Verified live
 * on 2026-08-03 against `https://meta.discourse.org/site/basic-info.json`: 200,
 * `application/json; charset=utf-8`, 873 bytes, `x-discourse-route:
 * site/basic_info`.
 *
 * The `title` is echoed into the report so an operator can see *which* forum
 * answered — the commonest real failure here is a Connection pointed at the
 * wrong site, which a bare "ok" would hide.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { normalizeSiteUrl } from "../lib/client.ts";

const site: HealthCheckDefinition = {
  key: "site",
  title: "Forum reachable",
  description:
    "Unauthenticated `GET /site/basic-info.json` against this connection's forum — the one " +
    "Discourse endpoint exempt from the login gate, so it proves the host resolves AND that " +
    "Discourse is serving JSON on it, even for a private forum.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { siteUrl?: string };
    if (!display.siteUrl) return { state: "unknown", message: "connection records no site URL" };

    let base: string;
    try {
      base = normalizeSiteUrl(display.siteUrl);
    } catch (err) {
      return { state: "unknown", message: (err as Error).message };
    }

    const res = await ctx.fetch(`${base}/site/basic-info.json`, {
      headers: { accept: "application/json" },
    });

    if (res.status >= 500) {
      return { state: "down", message: `forum returned ${res.status}`, ttlSeconds: 120 };
    }
    if (res.status === 404) {
      return {
        state: "down",
        message: "no Discourse at this URL — /site/basic-info.json is not routed",
        ttlSeconds: 120,
      };
    }
    if (!res.ok) {
      return { state: "degraded", message: `forum returned ${res.status}`, ttlSeconds: 120 };
    }

    const body = await res.json().catch(() => null) as
      | { title?: string; login_required?: boolean }
      | null;
    if (!body || typeof body.title !== "string") {
      // 200 with something that is not Discourse's payload: a parked page, a
      // proxy error page, or a captive portal. Reachable, but not this forum.
      return {
        state: "degraded",
        message: "host answered but did not return Discourse's site info",
        ttlSeconds: 120,
      };
    }

    return { state: "ok", message: body.title, ttlSeconds: 120 };
  },
};

export default site;
