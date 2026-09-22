import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrl, parseNocrmError, PING_PATH } from "../lib/client.ts";

/**
 * Is **this connection's** noCRM account host reachable and serving the API?
 *
 * Annotation, and why each axis is what it is — the same shape
 * `apps/gorgias/health/domain.ts` uses for its own per-tenant host:
 *
 *   - `kind: "dependency"` — a different question from the absent
 *     vendor-wide `service` check: whether THIS account's own host answers.
 *   - `scope: "connection"` — every Connection points at a different subdomain,
 *     which is also a different account.
 *   - `credential: "context"` — the posture a boolean would lose. The check
 *     needs the Connection to know WHICH host to call, and needs no credential
 *     to interpret the answer. `sign` must not run — and here that is
 *     **load-bearing**, not merely tidy: see below.
 *   - `severity` defaults to `degraded` for this kind.
 *   - No `network.allow` is declared: `*.nocrm.io` is already on the app's
 *     allowlist, and a `context` check is unsigned regardless.
 *
 * ## What was measured, and why the probe is `GET /api/v2/ping` unsigned
 *
 * noCRM serves its API on a wildcard `*.nocrm.io` host (a shared AWS ALB —
 * every subdomain resolves), so the interesting question is which of its
 * unauthenticated answers distinguish "an account lives here" from "no account
 * does". Measured live 2026-09-22 with no credential at all:
 *
 *   - `acme.nocrm.io/api/v2/ping` →
 *     `401 {"type":"unauthorized_missing_token","message":"Unauthorized:
 *     missing api_key or user token"}` — **an account exists here**.
 *   - `zzq9x7plm123.nocrm.io/api/v2/ping` (and three more invented names) →
 *     `401 {"type":"unauthorized_invalid_token","message":"Unauthorized:
 *     invalid api_key"}` — nothing answers for that subdomain.
 *   - `demo.nocrm.io/api/v2/ping` → `402 {"type":"suspended_account",
 *     "message":"Suspended account: pay your subscription to use the API."}` —
 *     a real account whose subscription has lapsed, refused wholesale.
 *   - `help.nocrm.io/api/v2/ping` → a plain `404` HTML page from a different
 *     service — not the API at all.
 *
 * So the vendor's own `type` field is the discriminator, exactly as the Errors
 * section intends ("The `type` is the attribute to test"), and the probe is
 * classified from the body rather than the status. **This is also why the check
 * must be unsigned**: sending any key turns the first answer above into
 * `unauthorized_invalid_token`, i.e. it would make every healthy account look
 * like a missing one. Credential validity is the derived `auth:api-key` /
 * `auth:user-token` checks' job.
 *
 * The probe is unauthenticated and signed by nothing, so no credential can
 * reach a check whose only job is reachability.
 */
const subdomain: HealthCheckDefinition = {
  key: "subdomain",
  title: "Account subdomain reachable",
  description:
    "Unauthenticated `GET /api/v2/ping` on this connection's own noCRM subdomain. Classified " +
    "from the vendor's `type` field: `unauthorized_missing_token` means the account is there " +
    "and only wants a credential, `unauthorized_invalid_token` means no account answers for " +
    "that subdomain, and `suspended_account` means the account exists but its subscription has " +
    "lapsed.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { subdomain?: string };
    if (!display.subdomain) {
      return { state: "unknown", message: "connection records no subdomain" };
    }

    const started = Date.now();
    let res: Response;
    try {
      res = await ctx.fetch(`${baseUrl(display.subdomain)}${PING_PATH}`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      // Nothing answered at the origin: DNS, TLS or transport.
      return {
        state: "down",
        message: `could not reach ${baseUrl(display.subdomain)}: ${String(err)}`,
        latencyMs: Date.now() - started,
      };
    }
    const latencyMs = Date.now() - started;
    const body = parseNocrmError(await res.text().catch(() => ""));

    if (res.status >= 500) {
      return {
        state: "down",
        message: `the noCRM API answered ${res.status} for this subdomain`,
        latencyMs,
      };
    }

    // The account is there and the API is answering; it simply has no credential
    // from this unsigned probe. That is the whole question.
    if (body.type === "unauthorized_missing_token") {
      return {
        state: "ok",
        message: "the account's API is serving — it answered `unauthorized_missing_token` to an " +
          "unsigned request, which is noCRM asking for a credential rather than a problem " +
          "with the host",
        latencyMs,
      };
    }

    // The account may exist but cannot serve any request. Worth naming precisely:
    // every action would fail the same way, and the fix is billing, not credentials.
    if (body.type === "suspended_account") {
      return {
        state: "degraded",
        message: body.message ??
          "the account exists but noCRM has suspended its API access (402 suspended_account)",
        latencyMs,
      };
    }

    // The wildcard host answers, but no account is routed for this subdomain.
    if (body.type === "unauthorized_invalid_token") {
      return {
        state: "down",
        message:
          `no noCRM account answers for ${display.subdomain}.nocrm.io — the platform replied ` +
          "`unauthorized_invalid_token`, the same answer it gives an invented subdomain. The " +
          "account may have been renamed or closed.",
        latencyMs,
      };
    }

    // Something answered, but not the documented API: an edge page, another
    // service on a sibling host, an HTML body.
    return {
      state: "down",
      message: `something answered at ${display.subdomain}.nocrm.io but not the noCRM API ` +
        `(HTTP ${res.status})`,
      latencyMs,
    };
  },
};

export default subdomain;
