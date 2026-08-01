import type { HookContext } from "@w6w/types";

/**
 * UptimeRobot API v2 — `https://api.uptimerobot.com/v2`.
 *
 * Every method is POST, and every request body is
 * `application/x-www-form-urlencoded` — there is no JSON request body and no
 * REST-style resource path; the "resource" is entirely the endpoint name
 * (`/newMonitor`, `/editMonitor`, ...). See `../auth/api-key.ts` for why the
 * API key itself is never set here: it is injected into the body by the auth
 * `sign` hook, exactly the way a header would be for a normal API.
 *
 * Verified directly against UptimeRobot's own published v2 docs
 * (`uptimerobot.com/api/legacy/`, fetched 2026-08-01): "While making a
 * request, you must send the api_key in your request's body." — confirmed
 * both in prose and in every example (`curl -d 'api_key=...&format=json'`).
 */
export const API_URL = "https://api.uptimerobot.com/v2";

/** Shape of the `error` object UptimeRobot returns when `stat !== "ok"`. */
export interface UptimeRobotErrorBody {
  type?: string;
  parameter_name?: string;
  message?: string;
}

/** Every UptimeRobot v2 response carries this envelope regardless of endpoint. */
export interface UptimeRobotEnvelope {
  stat: "ok" | "fail";
  error?: UptimeRobotErrorBody;
  [key: string]: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Builds a form-urlencoded body from `params`
 * (never including `api_key` or `format` — those two are injected by the auth
 * `sign` hook, not here) and unwraps UptimeRobot's `{ stat, error }` envelope,
 * throwing with the vendor's own message when `stat` is `"fail"`.
 */
export class UptimeRobotClient {
  constructor(private ctx: HookContext) {}

  async request<T = UptimeRobotEnvelope>(
    path: string,
    params: Record<string, string | number | boolean | undefined | null> = {},
  ): Promise<T> {
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      body.set(k, String(v));
    }

    const res = await this.ctx.fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      // Real HTTP-level failure — e.g. 429 once the plan's rate limit is hit,
      // which UptimeRobot returns as an actual status code rather than a
      // `stat: "fail"` envelope (see `../health/quota.ts`).
      let detail = "";
      try {
        detail = await res.text();
      } catch {
        // ignore — report the status alone.
      }
      throw new Error(`UptimeRobot ${res.status} ${res.statusText} for POST ${path}: ${detail}`);
    }

    const json = await res.json() as UptimeRobotEnvelope;
    if (json.stat !== "ok") {
      const err = json.error;
      const detail = err?.message ?? "unknown error";
      const param = err?.parameter_name ? ` (parameter: ${err.parameter_name})` : "";
      throw new Error(`UptimeRobot request failed: ${detail}${param}`);
    }
    return json as T;
  }
}

/** Monitor `type` codes (`newMonitor`/`editMonitor`/`getMonitors`). */
export const MONITOR_TYPE = {
  http: 1,
  keyword: 2,
  ping: 3,
  port: 4,
  heartbeat: 5,
} as const;

/** Monitor `status` codes as returned by `getMonitors`. */
export const MONITOR_STATUS = {
  paused: 0,
  notCheckedYet: 1,
  up: 2,
  seemsDown: 8,
  down: 9,
} as const;

/** `status` values accepted by `editMonitor` (pause/resume only — a subset of the read-side codes above). */
export const MONITOR_EDIT_STATUS = {
  pause: 0,
  resume: 1,
} as const;

/** Alert contact `type` codes (`newAlertContact`/`getAlertContacts`). */
export const ALERT_CONTACT_TYPE = {
  smsRestricted: 1,
  email: 2,
  twitterDm: 3,
  boxcar: 4,
  webhook: 5,
  pushbullet: 6,
  pushover: 9,
} as const;

/** `http_auth_type` codes for password-protected HTTP(S) monitors. */
export const HTTP_AUTH_TYPE = {
  basic: 1,
  digest: 2,
} as const;
