/**
 * Has the API version this app pins been deprecated yet?
 *
 * This check exists because Gusto answers the question itself, on every
 * response, and almost nobody reads it. Measured 2026-08-18 against
 * `api.gusto-demo.com`, an ordinary call returns:
 *
 *   x-gusto-api-version: 2026-06-15
 *
 * and, when the requested version has been deprecated, also:
 *
 *   deprecation: @1749945600
 *   link: <https://docs.gusto.com/embedded-payroll/docs/version-upgrade-guide>;
 *         rel="deprecation"; type="text/html"
 *
 * The `deprecation` value is an epoch second — RFC 8594's `@`-prefixed form —
 * and it is the date the version stops being supported. Sending **no** version
 * header at all produced `@1719792000`, a date in July 2024, which is how long
 * the unversioned default has been on borrowed time.
 *
 * A pinned API version is a silent liability: it works perfectly until it does
 * not, and the warning arrives in a header nobody looks at. So this check reads
 * it and reports:
 *
 *   - `ok` — no deprecation header: the pin is current;
 *   - `degraded` — deprecated with a date still ahead, and how many days are
 *     left;
 *   - `down` — the sunset date has passed, or Gusto served a *different*
 *     version than the one requested, which is what happens when a pin is no
 *     longer recognised.
 *
 * It is deliberately a `dependency` check rather than a `service` one: nothing
 * is wrong with Gusto, something is about to be wrong with this app.
 *
 * `credential: "signed"` because `/v1/token_info` is the cheapest authenticated
 * route, and the headers only come back on a real API response.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_VERSION, displayOf, hostFor } from "../lib/client.ts";

const DAY_MS = 86_400_000;

const apiVersion: HealthCheckDefinition = {
  key: "api-version",
  title: "Pinned API version",
  description:
    "Whether the API version this app pins is still supported, read from the `deprecation` " +
    "response header Gusto sends and nobody reads.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 3600,

  async check(_input, ctx) {
    const base = hostFor(displayOf(ctx.connection).environment);
    const res = await ctx.fetch(`${base}/v1/token_info`, {
      headers: { accept: "application/json", "x-gusto-api-version": API_VERSION },
    });
    // The body is irrelevant; the headers are the whole point.
    await res.body?.cancel();

    if (res.status === 401 || res.status === 403) {
      // The derived auth check reports credential problems; this one stays out
      // of the way rather than reporting the same failure twice.
      return { state: "unknown", message: `token_info returned ${res.status}` };
    }
    if (!res.ok) return { state: "unknown", message: `token_info returned ${res.status}` };

    const served = res.headers.get("x-gusto-api-version");
    if (served && served !== API_VERSION) {
      // Gusto silently falls back to the newest version when it does not
      // recognise the one asked for.
      return {
        state: "down",
        message:
          `this app pins ${API_VERSION} but Gusto served ${served} — the pinned version is no ` +
          "longer recognised, so every response may differ from what the actions expect",
      };
    }

    const deprecation = res.headers.get("deprecation");
    if (!deprecation) {
      return { state: "ok", message: `${API_VERSION} is current`, ttlSeconds: 3600 };
    }

    // RFC 8594: `@<epoch seconds>`.
    const epoch = Number(String(deprecation).replace(/^@/, ""));
    if (!Number.isFinite(epoch)) {
      return {
        state: "degraded",
        message: `${API_VERSION} is deprecated (Gusto sent \`${deprecation}\`)`,
      };
    }
    const sunset = new Date(epoch * 1000);
    const daysLeft = Math.round((sunset.getTime() - Date.now()) / DAY_MS);
    const guide = res.headers.get("link") ?? "";

    if (daysLeft <= 0) {
      return {
        state: "down",
        message:
          `${API_VERSION} was sunset on ${sunset.toISOString().slice(0, 10)} (${-daysLeft} days ` +
          `ago) — this app needs its pin moved${guide ? `. ${guide}` : ""}`,
      };
    }
    return {
      state: "degraded",
      message:
        `${API_VERSION} is deprecated and sunsets on ${sunset.toISOString().slice(0, 10)} — ` +
        `${daysLeft} days left`,
      ttlSeconds: 3600,
    };
  },
};

export default apiVersion;
