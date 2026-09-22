import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is noCRM up? — no status page exists to ask.
 *
 * Checked live 2026-09-22:
 *
 *   - `https://status.nocrm.io` answers a `302` to
 *     `https://nocrm.io/sessions/signin?flash_error=Compte+introuvable` ("account
 *     not found"), and the page behind it is noCRM's own per-tenant **login
 *     screen** (`<title>Login</title>`). noCRM gives every account a wildcard
 *     host under `nocrm.io`, so "status" is simply being read as a (nonexistent)
 *     tenant name by the product's own routing — not a status page.
 *   - `https://status.nocrm.io/api/v2/summary.json` — the conventional Statuspage
 *     path — answers `401 {"error":401,"message":"Unauthorized: invalid api_key",
 *     "type":"unauthorized_invalid_token"}`: **this API's own auth-error body**,
 *     not Statuspage JSON.
 *   - No `status`, `statuspage` or `instatus` link exists in the footer or nav of
 *     `www.nocrm.io` or `help.nocrm.io`, and the obvious third-party aliases
 *     (`nocrm.statuspage.io`, `nocrmio.instatus.com`) are unclaimed pages that
 *     redirect elsewhere rather than branded status boards for this product.
 *
 * So the absence is declared rather than invented, and this App wires up none of
 * those URLs.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in a roll-up, so at any other
 * severity this would pin the app's verdict at `unknown` forever.
 *
 * The automatable signals are the two derived checks — `auth:api-key` and
 * `auth:user-token`, projected from each Auth method's `test` hook, which
 * classify `GET /api/v2/ping` from the vendor's own body — plus this app's
 * `subdomain` dependency check, which tells a renamed/closed account apart from
 * an outage.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "noCRM platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "noCRM publishes no status page. status.nocrm.io is not one: it 302s to noCRM's own " +
      "tenant-login flow (nocrm.io/sessions/signin?flash_error=Compte+introuvable, a <title>" +
      "Login</title> page), because every account gets a wildcard *.nocrm.io host and 'status' " +
      "is just read as a nonexistent tenant name. status.nocrm.io/api/v2/summary.json returns " +
      "the API's own 401 unauthorized_invalid_token body rather than Statuspage JSON, and no " +
      "status/statuspage/instatus link appears on www.nocrm.io or help.nocrm.io (all verified " +
      "live 2026-09-22). The derived auth:api-key and auth:user-token checks (GET /api/v2/ping, " +
      "classified from the vendor's body) are the automatable signal for whether noCRM is " +
      "working for a given credential.",
  },
};

export default service;
