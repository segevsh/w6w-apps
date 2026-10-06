/**
 * Are the Diffbot API hosts answering?
 *
 * `kind: "dependency"`, `credential: "none"` — one unsigned request to each host
 * the app calls. **A schema-correct auth error is a PASS.** Measured 2026-10-06,
 * with no token:
 *
 * - `api.diffbot.com`, `kg.diffbot.com`, `nl.diffbot.com`:
 *   `401 {"message":"Unauthorized. Token is required.","requestId":…,"code":401}`
 * - `llm.diffbot.com`:
 *   `401 {"code":401,"message":"Missing or invalid Authorization header. Expected: Bearer <token>"}`
 *
 * The verdict is read from the body (`code` 401 plus a `message`), not from the
 * status alone, so a 401 from an unrelated proxy is `unknown`. A 5xx is `down`.
 * Credential validity is the derived `auth:*` check's job.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { API_HOST, KG_HOST, LLM_HOST, NL_HOST } from "../lib/client.ts";

interface Probe {
  host: string;
  url: string;
  init?: RequestInit;
}

export const PROBES: Probe[] = [
  { host: API_HOST, url: `https://${API_HOST}/v3/analyze?url=https%3A%2F%2Fexample.com` },
  { host: KG_HOST, url: `https://${KG_HOST}/kg/v3/dql?query=type%3AOrganization&size=1` },
  {
    host: NL_HOST,
    url: `https://${NL_HOST}/v1/?fields=sentiment`,
    init: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([{ content: "ping" }]),
    },
  },
  { host: LLM_HOST, url: `https://${LLM_HOST}/api/v1/web_search?text=ping&size=1` },
];

const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

/** `ok` when the host answered with Diffbot's own refusal (or a success). */
export function classify(status: number, raw: string): HealthComponentReport {
  if (status >= 500) return { state: "down", message: `HTTP ${status}` };
  if (status >= 200 && status < 300) return { state: "ok" };
  let body: { code?: unknown; message?: unknown } | null = null;
  try {
    body = JSON.parse(raw);
  } catch { /* not JSON */ }
  if (status === 401 && body?.code === 401 && typeof body.message === "string") {
    return { state: "ok" };
  }
  return { state: "unknown", message: `HTTP ${status} with a body that is not Diffbot's refusal` };
}

const api: HealthCheckDefinition = {
  key: "api",
  title: "API hosts reachable",
  description: "Unauthenticated request to api, kg, nl and llm .diffbot.com. Diffbot's JSON 401 " +
    "refusal passes: it proves the application is answering.",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const components: Record<string, HealthComponentReport> = {};
    await Promise.all(PROBES.map(async (p) => {
      try {
        const res = await ctx.fetch(p.url, {
          ...p.init,
          headers: { accept: "application/json", ...(p.init?.headers as Record<string, string>) },
        });
        components[p.host] = classify(res.status, await res.text().catch(() => ""));
      } catch (e) {
        components[p.host] = { state: "down", message: String((e as Error)?.message ?? e) };
      }
    }));
    const worst = Object.values(components).reduce<HealthState>(
      (acc, c) => RANK[c.state] > RANK[acc] ? c.state : acc,
      "ok",
    );
    const bad = Object.entries(components).filter(([, c]) => c.state !== "ok");
    return {
      state: worst,
      message: bad.length === 0
        ? "api, kg, nl and llm .diffbot.com are serving"
        : bad.map(([h, c]) => `${h}: ${c.message ?? c.state}`).join("; "),
      components,
      ttlSeconds: 120,
    };
  },
};

export default api;
