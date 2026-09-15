/**
 * Is this connection's MOCO account subdomain reachable?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — MOCO publishes a real status feed (see `service`), but that feed
 *     only says whether MOCO-the-platform is up, not whether *this* customer's account subdomain
 *     resolves. The one thing that can be probed automatically per-connection is the latter.
 *   - `scope: "connection"` — every Connection points at a different subdomain, which is a
 *     different account.
 *   - `credential: "context"` — the check needs the Connection to know WHICH host to call, and
 *     needs no credential to interpret the answer. `sign` must not run.
 *   - No `network.allow` is declared: `*.mocoapp.com` is already on the app's allowlist, and a
 *     `context` check is unsigned regardless.
 *
 * The probe is deliberately unauthenticated `GET /session`, so **a 401 with an "Invalid API key"
 * body is a pass** — it proves the subdomain resolves, TLS terminates, and the API is answering.
 * Whether the credential is any good is the derived `auth:*` check's job.
 *
 * MOCO's own quirk (verified live 2026-09-15) is that a *wrong subdomain* also answers 401, with a
 * different message: `{"message":"Subdomain does not exist."}` vs `{"message":"Invalid API
 * key."}`. Both share one HTTP status, so this check reads the message body rather than trusting
 * the status code — the same rule the auth `test` hook follows, and the reason a status-code-only
 * probe would misreport "the account was renamed" as "credential expired" or vice versa.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrl, errorDetail } from "../lib/client.ts";

const account: HealthCheckDefinition = {
  key: "account",
  title: "Account subdomain reachable",
  description:
    "Unauthenticated request to this connection's MOCO account subdomain. A 401 whose body " +
    "complains about the API key (not the subdomain) still passes — credential validity is the " +
    "`auth:*` check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { account?: string };
    if (!display.account) {
      return { state: "unknown", message: "connection records no account subdomain" };
    }

    const res = await ctx.fetch(`${baseUrl(display.account)}/session`);
    if (res.status >= 500) {
      return { state: "down", message: `account subdomain returned ${res.status}` };
    }
    if (res.status === 401) {
      const text = await res.text().catch(() => "");
      const detail = errorDetail(text) ?? "";
      if (/subdomain/i.test(detail)) {
        return {
          state: "down",
          message: `no such MOCO account: "${display.account}.mocoapp.com" (${detail})`,
        };
      }
      // Any other 401 body ("Invalid API key.", etc.) means the subdomain itself is fine.
      return { state: "ok", ttlSeconds: 120 };
    }
    // 200 (an unauthenticated GET should never see this, but treat it as healthy if it happens).
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default account;
