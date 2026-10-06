import type { AuthDefinition } from "@w6w/types";
import { API_URLS, DEFAULT_REGION, errorText, isRegion, type Region } from "../lib/client.ts";

interface StoredCredential {
  apiKey: string;
  region?: string;
}

const regionOf = (c: Partial<StoredCredential>): Region =>
  isRegion(c.region) ? c.region : DEFAULT_REGION;

const REGION_LABEL: Record<Region, string> = {
  "us-east-1": "US East (us-east-1)",
  "us-west-2": "US West (us-west-2)",
  "eu-central-1": "EU (eu-central-1, Frankfurt)",
  "ap-northeast-1": "Asia (ap-northeast-1, Tokyo)",
};

/**
 * API key — `Authorization: Token <key>` (the `Token ` prefix is documented as optional). Keys
 * are created in the Recall dashboard of one region (Developers > API Keys), belong to a user but
 * grant workspace-scoped access, and never expire until disabled.
 *
 * `region` is collected next to the key because each region is a fully separate deployment: the
 * key only works on its own region's host, and a key used on another region answers
 * `authentication_failed` ("might be for another Recall region").
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Create a key in the Recall dashboard of your region (Developers > API Keys). Sent as `Authorization: Token <key>`.",
  connectionLabel: "Recall.ai ({{region}})",
  apiKey: { in: "header", name: "Authorization", prefix: "Token " },
  fields: [
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      default: DEFAULT_REGION,
      options: (Object.keys(API_URLS) as Region[]).map((value) => ({
        value,
        label: REGION_LABEL[value],
      })),
      hint:
        "The region your Recall account was created in. Accounts and keys are region-local; pay-as-you-go signups on recall.ai land in US West.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "<region>.recall.ai/dashboard/developers/api-keys",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as StoredCredential;
    request.headers["authorization"] = `Token ${apiKey}`;
    return request;
  },

  /**
   * Probe: `GET /api/v1/bot/?page=1`, a plain list that answers `{count, next, previous,
   * results}` and echoes nothing about the key (Recall has no whoami endpoint). The verdict is
   * read from the BODY: a 2xx must carry a `results` array, and a rejection is told apart by
   * Recall's own `code` (`authentication_failed` / `not_authenticated`), never by the status. A
   * 402 (insufficient prepaid balance) still proves the key was recognised, so it passes.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<StoredCredential>;
    if (!cred.apiKey) return { ok: false, message: "credential missing apiKey" };
    const region = regionOf(cred);

    let res: Response;
    try {
      res = await ctx.fetch(`${API_URLS[region]}/api/v1/bot/?page=1`, {
        headers: { authorization: `Token ${cred.apiKey}`, accept: "application/json" },
      });
    } catch (e) {
      return { ok: false, message: `could not reach the Recall ${region} API: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: the request probably never reached Recall */ }
    const obj = (body && typeof body === "object" ? body : {}) as {
      code?: string;
      detail?: string;
      results?: unknown;
    };

    if (res.ok) {
      return Array.isArray(obj.results) ? { ok: true } : {
        ok: false,
        message: `unexpected ${res.status} body from GET /api/v1/bot/ — no results list in it`,
      };
    }
    if (res.status === 402) return { ok: true };
    if (obj.code === "authentication_failed" || obj.code === "not_authenticated") {
      return {
        ok: false,
        message: `${
          errorText(obj)
        } — check the key and that Region (${region}) is the one it was created in`,
      };
    }
    if (obj.code === "request_blocked") {
      return { ok: false, message: `Recall's firewall blocked the request: ${errorText(obj)}` };
    }
    if (!obj.code && !obj.detail) {
      return {
        ok: false,
        message:
          `Recall returned ${res.status} with a non-error body; the request may not have reached the API`,
      };
    }
    if (res.status >= 500) {
      return { ok: false, message: `Recall is erroring (${res.status}): ${errorText(obj)}` };
    }
    return { ok: false, message: errorText(obj) || `Recall returned ${res.status}` };
  },

  /** Records the region: the only place a non-secret field survives. */
  afterConnect({ credential }) {
    return { region: regionOf(credential as Partial<StoredCredential>) };
  },
};

export default apiKey;
