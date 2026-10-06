/**
 * Are the two Maileroo API hosts answering?
 *
 * `kind: "dependency"`, `credential: "none"` — an unsigned GET to each host. **A schema-correct
 * auth error is a PASS.** Measured 2026-10-06 with no key:
 *
 * - `api.maileroo.com/v1/account` → `401 {"error":{"message":"Please provide a valid API key in
 *   the Authorization header."}}`
 * - `smtp.maileroo.com/api/v2/emails/scheduled` → `{"message":"You have used an invalid API
 *   key…","success":false}`
 *
 * Both prove the application is serving. The verdict is read from the body (an object carrying
 * the vendor's `error.message` or `{success:false,message}` shape), not the status alone, so a
 * 401 from an unrelated proxy is `unknown`; a 5xx is `down`. Credential validity is the derived
 * `auth:*` check's job.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { ACCOUNT_BASE, SEND_BASE, vendorMessage } from "../lib/client.ts";

const TARGETS = [
  { name: "api.maileroo.com", url: `${ACCOUNT_BASE}/account` },
  { name: "smtp.maileroo.com", url: `${SEND_BASE}/emails/scheduled` },
];

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET to the Account API and the Email API. Maileroo's own JSON " +
    "auth-error body passes: it proves the application is answering.",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const states: HealthState[] = [];
    const notes: string[] = [];
    for (const t of TARGETS) {
      let res: Response;
      try {
        res = await ctx.fetch(t.url, { headers: { accept: "application/json" } });
      } catch (err) {
        states.push("down");
        notes.push(`${t.name} unreachable: ${(err as Error).message}`);
        continue;
      }
      const text = await res.text().catch(() => "");
      if (res.status >= 500) {
        states.push("down");
        notes.push(`HTTP ${res.status} from ${t.name}`);
        continue;
      }
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch { /* not JSON */ }
      if (res.ok || vendorMessage(body) !== undefined) {
        states.push("ok");
      } else {
        states.push("unknown");
        notes.push(`${t.name} answered HTTP ${res.status} with a body that is not Maileroo's JSON`);
      }
    }
    const state: HealthState = states.includes("down")
      ? "down"
      : states.includes("unknown")
      ? "unknown"
      : "ok";
    return {
      state,
      message: state === "ok"
        ? "api.maileroo.com and smtp.maileroo.com are serving"
        : notes.join("; "),
      ttlSeconds: 120,
    };
  },
};

export default api;
