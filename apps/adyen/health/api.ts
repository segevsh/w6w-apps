import type { HealthCheckDefinition } from "@w6w/types";
import { parseServiceError, TEST_BASE } from "../lib/client.ts";

/**
 * Unauthenticated reachability of the Checkout API.
 *
 * `POST /paymentMethods` with a JSON body and no key answers (measured
 * 2026-10-05) HTTP 401 with Adyen's own error envelope
 * `{"status":401,"errorCode":"000","errorType":"security", ...}` and a
 * `www-authenticate: BASIC realm="Adyen PAL Service Authentication"` header.
 * That proves the API answered, so it is a **pass**; whether a given
 * credential works is the derived auth check's job. HTML instead of JSON means
 * something in front of the API is answering; a 5xx or a network failure is a
 * real outage.
 *
 * The authentication layer sits in front of routing: the same 401 answers an
 * unknown path (`/v72/zzz-bogus`), and a body-less `GET` gets the plain text
 * `000 HTTP Status Response - Unauthorized` instead of JSON. That is why the
 * probe is a JSON POST — only it returns the schema-correct envelope — and why
 * it proves "Adyen's gateway answered", not "this route exists".
 * It sends no credential and creates nothing.
 *
 * The test host is probed because a check has no connection and so no live
 * prefix. It is already in the app's `network.allow`.
 */
export const PROBE_URL = `${TEST_BASE}/paymentMethods`;

const api: HealthCheckDefinition = {
  key: "api",
  title: "Adyen Checkout API reachability",
  description:
    "Unauthenticated POST /paymentMethods on checkout-test.adyen.com. A schema-correct " +
    "security error envelope proves the API answered; credential validity is checked separately.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(PROBE_URL, {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({ merchantAccount: "w6w-health-probe" }),
      });
    } catch (e) {
      return {
        state: "down",
        message: `checkout-test.adyen.com is unreachable: ${
          e instanceof Error ? e.message : String(e)
        }`,
      };
    }
    const raw = await res.text().catch(() => "");
    if (res.status >= 500) {
      return { state: "down", message: `Adyen returned HTTP ${res.status}` };
    }
    const err = parseServiceError(raw);
    if (err && (err.errorType !== undefined || err.errorCode !== undefined)) {
      return { state: "ok", ttlSeconds: 60 };
    }
    if (raw.trimStart().startsWith("<")) {
      return {
        state: "down",
        message: `API host returned markup rather than JSON (HTTP ${res.status})`,
      };
    }
    return {
      state: "unknown",
      message: `API host returned HTTP ${res.status} with no readable error envelope`,
    };
  },
};

export default api;
