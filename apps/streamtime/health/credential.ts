import type { HealthCheckDefinition } from "@w6w/types";
import { PROBE_URL, readProbe } from "../auth/api-token.ts";

/**
 * Is this connection's bearer token still accepted?
 *
 * The probe is `GET /organisation` — the same call `auth/api-token.ts` uses, and
 * the only one that makes sense here. It requires a credential, returns the
 * organisation's own record on success, and **never echoes the token**, so
 * running it on a schedule cannot accumulate credential material in the health
 * surface.
 *
 * ## The verdict comes from the body, not the status code
 *
 * Streamtime answers `401` with the byte-identical body
 * `You are not authorised to make this request` for a missing token, an invalid
 * token, and a path that does not exist — verified live on 2026-09-22 against
 * all three. So:
 *
 *  - **that exact body** → `down`: the credential is not being accepted. This is
 *    the one case Streamtime states in its own words.
 *  - **a 2xx carrying an `Organisation`** → `ok`.
 *  - **anything else** — a 2xx that is not an Organisation, a 401 whose body is
 *    not the vendor's string, a 5xx, a transport failure — → `unknown`. This app
 *    cannot tell a broken credential from a broken gateway there, and guessing
 *    "your token expired" is how a healthy connection gets reconnected for
 *    nothing.
 *
 * The credential posture is `signed`, so the host's `sign` hook stamps the
 * header exactly as it does for an Action, and this file never touches a token.
 * Egress is the app's own allowlist (`api.streamtime.net`) — a signed check may
 * not widen it, so no `network` block appears here.
 */
const check: HealthCheckDefinition = {
  key: "credential",
  kind: "credential",
  scope: "connection",
  credential: "signed",
  title: "Bearer token accepted",
  description:
    "Reads GET /organisation with this connection's token. Streamtime returns the same 401 body " +
    "for a missing token, a revoked token and an unknown path, so the check classifies from that " +
    "body rather than from the status code.",
  covers: ["credential"],
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    let res: Response;
    const started = Date.now();
    try {
      res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "unknown", message: `could not reach ${PROBE_URL}: ${String(err)}` };
    }
    const latencyMs = Date.now() - started;
    const reading = await readProbe(res);

    if (reading.reason === "accepted") {
      return {
        state: "ok",
        message: `organisation "${reading.organisation?.name}"`,
        latencyMs,
      };
    }
    if (reading.reason === "rejected") {
      return { state: "down", message: reading.detail, latencyMs };
    }
    return { state: "unknown", message: reading.detail, latencyMs };
  },
};

export default check;
