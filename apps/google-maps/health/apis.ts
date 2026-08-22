import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { HOSTS, LEGACY_BASE } from "../lib/client.ts";

/**
 * Which Maps APIs is this key actually allowed to call?
 *
 * ## The problem this exists for
 *
 * Google Maps Platform is one credential in front of roughly a dozen products,
 * and **each is enabled separately on the Cloud project**. A key that geocodes
 * flawlessly returns `REQUEST_DENIED` from Places until somebody clicks Enable
 * on the Places API, and there is nothing about the key itself to distinguish
 * the two states. The connection test can only speak for the one API it calls.
 *
 * The failure this prevents is specific and common: a workflow is built and
 * tested against geocoding, ships, and the first time it reaches the Routes
 * step in production it fails — with an error that reads like a bad request,
 * because on the newer APIs a disabled service is a `403` and a refused key is
 * a `400`.
 *
 * ## How it asks without buying anything
 *
 * Each probe sends a request that is **deliberately unanswerable**: a required
 * parameter left out. That is enough to tell the two cases apart, because they
 * fail at different layers and in different words:
 *
 *  - **Not enabled / key refused** — the request never reaches the service.
 *    Generation 1 answers `REQUEST_DENIED`; generation 2 answers `403` with
 *    `SERVICE_DISABLED`, or `400` with `API_KEY_INVALID`.
 *  - **Enabled** — the service itself answers, complaining about the missing
 *    parameter: `INVALID_REQUEST` on generation 1, `400 INVALID_ARGUMENT` with
 *    a message naming the field on generation 2.
 *
 * So "the API told me my request was wrong" is the *good* outcome here, which
 * is worth stating plainly because it inverts the usual reading. Nothing is
 * geocoded, no place is looked up and no route is computed, so the probe asks
 * for no data and does not depend on any particular address existing.
 *
 * ## Posture
 *
 * `credential: "signed"` — this is the one check that has to use the key,
 * because the key is the whole question. `minIntervalSeconds` is 900: API
 * enablement changes when a person clicks a button in a console, not minute to
 * minute, and five requests every quarter hour is a reasonable price for
 * knowing.
 *
 * The state is `degraded`, never `down`, when some APIs are off: a connection
 * that only geocodes is perfectly healthy with Places disabled, and this check
 * cannot know which actions a workflow uses.
 */

export interface ApiProbe {
  /** Component key in the report. */
  key: string;
  /** Human name, as the Cloud console lists it. */
  title: string;
  url: string;
  method: "GET" | "POST";
  body?: unknown;
  /** Generation 1 puts the outcome in the body with an HTTP 200. */
  legacy: boolean;
}

export const PROBES: ApiProbe[] = [
  {
    key: "geocoding",
    title: "Geocoding API",
    // No `address`, no `latlng` — the service itself has to reject this.
    url: `${LEGACY_BASE}/geocode/json`,
    method: "GET",
    legacy: true,
  },
  {
    key: "timezone",
    title: "Time Zone API",
    // No `location`, no `timestamp`.
    url: `${LEGACY_BASE}/timezone/json`,
    method: "GET",
    legacy: true,
  },
  {
    key: "places",
    title: "Places API (New)",
    // No field mask and an empty query: refused by Places, not by the front door.
    url: `${HOSTS.places}/v1/places:searchText`,
    method: "POST",
    body: {},
    legacy: false,
  },
  {
    key: "routes",
    title: "Routes API",
    // No origin, no destination.
    url: `${HOSTS.routes}/directions/v2:computeRoutes`,
    method: "POST",
    body: {},
    legacy: false,
  },
  {
    key: "address-validation",
    title: "Address Validation API",
    // No address.
    url: `${HOSTS.addressValidation}/v1:validateAddress`,
    method: "POST",
    body: {},
    legacy: false,
  },
];

/** What a generation-1 body says about enablement. */
export function readLegacy(status: string | undefined, message: string): HealthState {
  if (status === "REQUEST_DENIED") return "down";
  // The service answered and complained — which means it is switched on.
  if (status === "INVALID_REQUEST" || status === "OK" || status === "ZERO_RESULTS") return "ok";
  if (status === "OVER_QUERY_LIMIT") return "degraded";
  return message ? "unknown" : "unknown";
}

/** What a generation-2 status code and body say about enablement. */
export function readRpc(
  httpStatus: number,
  message: string,
  reason: string | undefined,
): HealthState {
  if (reason === "SERVICE_DISABLED" || /has not been used in project|is disabled/i.test(message)) {
    return "down";
  }
  if (reason === "API_KEY_INVALID" || /API key not valid/i.test(message)) return "down";
  if (httpStatus === 403 && /referer|referrer/i.test(message)) return "down";
  if (httpStatus === 429) return "degraded";
  // A complaint about the request body is the service itself talking.
  if (httpStatus === 400 || httpStatus === 200) return "ok";
  return "unknown";
}

interface RpcBody {
  error?: { message?: string; details?: Array<{ reason?: string }> };
}

const apis: HealthCheckDefinition = {
  key: "apis",
  title: "Enabled APIs",
  description:
    "Which Maps APIs this key can reach. Each one is enabled separately on the Cloud project, " +
    "so a key that geocodes proves nothing about Places or Routes — and a disabled API fails in " +
    "production with an error that reads like a bad request.",
  kind: "credential",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  severity: "informational",
  minIntervalSeconds: 900,

  async check(_input, ctx) {
    const components: Record<string, HealthComponentReport> = {};

    for (const probe of PROBES) {
      let res: Response;
      try {
        res = await ctx.fetch(probe.url, {
          method: probe.method,
          headers: probe.body === undefined
            ? { accept: "application/json" }
            : { accept: "application/json", "content-type": "application/json" },
          body: probe.body === undefined ? undefined : JSON.stringify(probe.body),
        });
      } catch (err) {
        components[probe.key] = { state: "unknown", message: String(err).slice(0, 120) };
        continue;
      }
      const text = await res.text().catch(() => "");

      if (probe.legacy) {
        const body = safeParse<{ status?: string; error_message?: string; errorMessage?: string }>(
          text,
        );
        const message = body?.error_message ?? body?.errorMessage ?? "";
        const state = readLegacy(body?.status, message);
        components[probe.key] = state === "ok"
          ? { state }
          : { state, message: `${body?.status ?? res.status}${message ? `: ${message}` : ""}` };
        continue;
      }

      const body = safeParse<RpcBody>(text);
      const message = body?.error?.message ?? "";
      const reason = body?.error?.details?.find((d) => d.reason)?.reason;
      const state = readRpc(res.status, message, reason);
      components[probe.key] = state === "ok"
        ? { state }
        : { state, message: message.slice(0, 160) };
    }

    const off = PROBES.filter((p) => components[p.key]?.state === "down");
    const unknown = PROBES.filter((p) => components[p.key]?.state === "unknown");

    if (off.length === PROBES.length) {
      return {
        state: "down",
        message: "every probed API refused this key — it is invalid, restricted to HTTP " +
          "referrers (which cannot work server-side), or its project has billing disabled",
        components,
      };
    }
    if (off.length > 0) {
      return {
        // Never `down`: a connection that only geocodes is fine with Places off.
        state: "degraded",
        message: `not enabled for this key: ${off.map((p) => p.title).join(", ")} — enable each ` +
          "in the Cloud console, or ignore this if no workflow calls them",
        components,
        ttlSeconds: 900,
      };
    }
    if (unknown.length > 0) {
      return {
        state: "unknown",
        message: `could not tell for: ${unknown.map((p) => p.title).join(", ")}`,
        components,
      };
    }
    return {
      state: "ok",
      message: `${PROBES.length} APIs reachable: ${PROBES.map((p) => p.title).join(", ")}`,
      components,
      ttlSeconds: 900,
    };
  },
};

function safeParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export default apis;
