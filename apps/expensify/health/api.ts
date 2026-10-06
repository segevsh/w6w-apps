/**
 * Is the Integration Server answering? An unsigned reachability probe.
 *
 * Measured 2026-10-06, `POST /Integration-Server/ExpensifyIntegrations` with a job and no
 * credentials answers HTTP **200** with `{"responseMessage":"No authentication method
 * specified","responseCode":403}`; a wrong pair answers `{"responseMessage":"Authentication
 * error","responseCode":404}`, also HTTP 200. The status code never carries the verdict, so this
 * reads the envelope: a schema-correct `{responseCode, responseMessage}` error proves DNS, TLS and
 * the application are working — a PASS. Whether any credential is good is the derived
 * `auth:partner-credentials` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { buildBody, ENDPOINT, envelope } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "Integration Server reachability",
  description:
    "Unauthenticated policyList job against integrations.expensify.com. Expensify's `{responseCode, responseMessage}` error envelope is the expected healthy answer; credential validity is the `auth:partner-credentials` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(ENDPOINT, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: buildBody({ type: "get", inputSettings: { type: "policyList" } }),
      });
    } catch (e) {
      return { state: "down", message: `could not reach integrations.expensify.com: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    const body = envelope(raw);
    const shaped = typeof body?.responseCode === "number" &&
      typeof body?.responseMessage === "string";

    if (res.status >= 500) {
      return { state: "down", message: `Integration Server returned ${res.status}` };
    }
    if (!shaped) {
      return {
        state: "degraded",
        message:
          `${res.status} without Expensify's response envelope — an intermediary may be answering`,
      };
    }
    if (body!.responseCode === 200) {
      return {
        state: "degraded",
        message: "unauthenticated job returned responseCode 200; expected an authentication error",
      };
    }
    if (body!.responseCode === 429) {
      return { state: "degraded", message: "Integration Server is rate limiting", ttlSeconds: 60 };
    }
    if (body!.responseCode === 403 || body!.responseCode === 404) {
      return {
        state: "ok",
        message: "Integration Server answered with the documented authentication error",
        ttlSeconds: 60,
      };
    }
    return {
      state: "degraded",
      message: `Integration Server answered ${body!.responseCode}: ${body!.responseMessage}`,
    };
  },
};

export default api;
