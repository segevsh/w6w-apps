import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Is Relevance AI up? — a real **Better Stack** status page at
 * `status.relevanceai.com`, verified on 2026-09-22.
 *
 * ## The four verifications
 *
 * **(a) A machine-readable endpoint exists.** `GET /index.json` answers 200 with
 * 109,987 bytes of JSON:API — not the catch-all HTML the host serves for every
 * path it does not recognise. (Better Stack has no Statuspage surface at all, so
 * the Statuspage-shaped paths integrators try first are decoys here, exactly as
 * they are on Raindrop's and Airparser's pages.)
 *
 * **(b) The page names this product.** Its own payload:
 *
 *     "company_name":  "Relevance AI",
 *     "company_url":   "https://relevanceai.com",
 *     "custom_domain": "status.relevanceai.com",
 *     "subdomain":     "relevanceai",
 *     "aggregate_state": "operational"
 *
 * **(c) It has components covering the API — and ONLY three of them count.**
 * The page's 31 resources span four unrelated sections: `Application`
 * (Agent Builder, Chat), `LLM providers` (Anthropic, OpenAI), `Third party
 * providers` (WorkOS, Serper, Modal, Orb Billing, Pipedream) and `API Gateways`:
 *
 *     AU API  (id 8541218)   EU API  (id 8541219)   US API  (id 8559600)
 *
 * Matching `public_name` against `/ API$/` picks exactly those three and
 * excludes every other resource — including `Orb Billing`, which would otherwise
 * be caught by a substring match on the vendor's name. All three are matched, not
 * one: this app has no idea which region a given Connection is on, so the
 * question it can honestly answer is "is any API gateway degraded?" — and the
 * per-connection question ("is *my* region answering?") is `host.ts`'s job.
 *
 * **(d) The page's own `aggregate_state` is not the verdict.** It rolls up all 31
 * resources, so an OpenAI outage would be reported as a Relevance AI API problem.
 * The state here is derived from the three `API Gateways` components only. This is
 * the one deliberate divergence from `apps/raindrop/health/service.ts`, whose
 * aggregate really did cover only its own five resources.
 *
 * ## Annotation
 *
 *  - `kind: "service"` — is the vendor's platform up, a different question from
 *    "is this credential live" (the derived `auth:*` check) and "is this region
 *    host reachable" (`host`, a `dependency` check).
 *  - `scope: "app"`, `credential: "none"` — one status page, one answer, shared by
 *    every Connection; a status host must never see a credential.
 *  - `network.allow` — `status.relevanceai.com` is deliberately absent from the
 *    app's own allowlist; no Action has business calling it.
 *  - `severity` stays at this kind's `degraded` default, so a vendor incident
 *    never hard-fails a target on its own.
 */

const STATUS_HOST = "status.relevanceai.com";

export const STATUS_URL = `https://${STATUS_HOST}/index.json`;

/**
 * Better Stack's resource vocabulary.
 *
 * `maintenance` maps to `degraded` rather than `down`: planned work is not an
 * outage, but it is not business as usual either. Anything unrecognised becomes
 * `unknown` rather than being optimistically read as healthy.
 */
export const STATE: Record<string, HealthState> = {
  operational: "ok",
  degraded: "degraded",
  downtime: "down",
  maintenance: "degraded",
};

/** Worst-first, matching `HEALTH_STATE_RANK` in `@w6w/types`. */
const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

export function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * The three API components, and nothing else on the page.
 *
 * `AU API`, `EU API` and `US API` all end in `" API"`; `Orb Billing`, `Anthropic`,
 * `Agent Builder` and the rest do not. Anchored at the end so a future component
 * called e.g. "API Gateway" is not silently swept in.
 */
export const API_COMPONENT = / API$/;

export function isApiComponent(publicName: string | undefined): boolean {
  return typeof publicName === "string" && API_COMPONENT.test(publicName);
}

interface StatusPayload {
  data?: {
    attributes?: {
      aggregate_state?: string;
      company_name?: string;
      custom_domain?: string;
    };
  };
  included?: Array<{
    type?: string;
    attributes?: {
      public_name?: string;
      status?: string;
      explicit_status?: string | null;
    };
  }>;
}

/**
 * Does this page still describe Relevance AI?
 *
 * The failure mode this guards is a healthy, *claimed* status page that belongs
 * to someone else — a rebrand, a redirect, or a subdomain that changed hands.
 * `company_name` and `custom_domain` are the page's own self-identification, so
 * checking either is enough; both are accepted because Better Stack lets an
 * operator change the display name without changing the domain.
 */
export function identifiesRelevanceAi(
  attrs: { company_name?: string; custom_domain?: string } | undefined,
): boolean {
  const name = (attrs?.company_name ?? "").toLowerCase();
  const domain = (attrs?.custom_domain ?? "").toLowerCase();
  if (!name && !domain) return false;
  return name.includes("relevance") || domain === STATUS_HOST;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Relevance AI platform status",
  description:
    "Better Stack status page for status.relevanceai.com, read through its three API Gateways " +
    "components (AU API, EU API, US API) rather than the page-wide aggregate, which also covers " +
    "Agent Builder, Chat and the page's LLM/third-party providers.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // `unknown`, never `down`: a status page that itself fails tells you nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    // The host serves HTML for anything it does not recognise, so a parse
    // failure here means the JSON endpoint moved — not that Relevance AI is down.
    const body = await res.json().catch(() => null) as StatusPayload | null;
    if (!body) {
      return {
        state: "unknown",
        message: "status page did not return JSON — `GET /index.json` on Better Stack serves the " +
          "page's data, so it may have moved",
      };
    }

    const attrs = body.data?.attributes;
    if (!identifiesRelevanceAi(attrs)) {
      return {
        state: "unknown",
        message: "status page no longer self-identifies as Relevance AI's",
      };
    }

    const components: Record<string, HealthComponentReport> = {};
    let state: HealthState = "ok";
    for (const entry of body.included ?? []) {
      if (entry.type !== "status_page_resource") continue;
      const name = entry.attributes?.public_name;
      if (!name || !isApiComponent(name)) continue;
      // `explicit_status` is an operator override; it wins over the measured one.
      const raw = entry.attributes?.explicit_status ?? entry.attributes?.status ?? "";
      const componentState = STATE[raw] ?? "unknown";
      // The name goes in the message even when healthy: the key is a slug, and a
      // reader skimming a component list needs to see which one is which.
      components[slug(name)] = componentState === "ok"
        ? { state: componentState, message: name }
        : {
          state: componentState,
          message: `${name}: ${raw || "no status"}`,
        };
      if (RANK[componentState] > RANK[state]) state = componentState;
    }

    const names = Object.keys(components);
    if (names.length === 0) {
      return {
        state: "unknown",
        message: "status page exposed no `* API` components — the API Gateways section may have " +
          "been renamed, so the page-wide aggregate is not a substitute this app will use",
      };
    }

    const affected = Object.entries(components).filter(([, c]) => c.state !== "ok");
    return {
      state,
      message: affected.length === 0
        ? `${Object.values(components).map((c) => c.message).join(", ")} operational`
        : `affected: ${affected.map(([, c]) => c.message).join(", ")}`,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
