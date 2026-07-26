/**
 * Is this connection's Zendesk subdomain reachable?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — Zendesk publishes no machine-readable status
 *     (which is why `service` is declared `unavailable`), and its human page is
 *     per-pod anyway. The one thing that can be probed automatically is whether
 *     THIS account's subdomain answers.
 *   - `scope: "connection"` — every Connection points at a different subdomain,
 *     which is also a different pod.
 *   - `credential: "context"` — the posture a boolean would lose. The check
 *     needs the Connection to know WHICH host to call, and needs no credential
 *     to interpret the answer. `sign` must not run.
 *   - No `network.allow` is declared: `*.zendesk.com` is already on the app's
 *     allowlist, and a `context` check is unsigned regardless.
 *   - `severity` defaults to `degraded` for this kind.
 *
 * The probe is deliberately unauthenticated, so a **401 is a pass**: it proves
 * the subdomain resolves, TLS terminates, and the API is answering — which is
 * exactly what this check is for. Whether the credential is any good is the
 * derived `auth:*` check's job, and conflating the two is how "the account was
 * renamed" gets misreported as "your token expired". Only a transport failure
 * (the hook throws), a 404 (subdomain gone) or a 5xx counts as down.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

const account: HealthCheckDefinition = {
  key: "account",
  title: "Account subdomain reachable",
  description:
    "Unauthenticated request to this connection's Zendesk subdomain. A 401 passes — it proves the pod is serving; credential validity is the `auth:*` check's job.",
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

    const res = await ctx.fetch(`${baseUrl(display.subdomain)}/users/me.json`);
    if (res.status === 404) {
      return { state: "down", message: "subdomain not found — the account may have been renamed" };
    }
    if (res.status >= 500) {
      return { state: "down", message: `subdomain returned ${res.status}` };
    }
    // 200 and 401 both mean the pod is serving. That is the whole question.
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default account;
