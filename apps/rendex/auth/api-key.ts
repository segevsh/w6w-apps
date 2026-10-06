import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Rendex API key — `Authorization: Bearer rdx_...`.
 *
 * The docs also mention an `x-api-key` header and (GET /v1/screenshot only) a `?key=` query
 * parameter; this app only ever uses the header, so the key never lands in a URL or a log.
 *
 * ## The probe is `GET /v1/account`
 *
 * Documented as read-only and free ("never spends a credit"), it needs a live key and returns
 * plan and usage figures, never the key. Measured 2026-10-06 against `api.rendex.dev`:
 * no key answers 401 `{"success":false,"error":{"code":"MISSING_API_KEY",...}}`; a wrong key
 * 401 `INVALID_KEY` (the error-codes page says `INVALID_API_KEY`, so both are matched); a
 * revoked key is documented as 403 `KEY_DISABLED`.
 *
 * ## Classified from the body, not the status
 *
 * Only a rejection code from the key family fails the test. Any other well-formed error
 * (429 `RATE_LIMITED` / `USAGE_EXCEEDED`, a plan 403) means the key was recognised, so the
 * credential is live and passes; anything that is not a Rendex JSON body is a failure.
 */
export const PROBE_PATH = `${API_PREFIX}/account`;

/** Error codes that mean "this key is not accepted". */
export const KEY_REJECTED = new Set([
  "MISSING_API_KEY",
  "INVALID_KEY",
  "INVALID_API_KEY",
  "KEY_DISABLED",
]);

interface ProbeBody {
  success?: boolean;
  data?: { plan?: unknown };
  error?: { code?: string; message?: string };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description: "Create a key in the Rendex dashboard (Dashboard → Keys). Keys start with rdx_.",
  connectionLabel: "Rendex",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Rendex dashboard → Keys. Treat it like a password.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey?: string };
    request.headers["authorization"] = `Bearer ${(apiKey ?? "").trim()}`;
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as { apiKey?: string })?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", authorization: `Bearer ${key}` },
    });
    const body = await res.json().catch(() => null) as ProbeBody | null;
    const code = body?.error?.code;

    if (res.ok && body?.success === true && body.data?.plan !== undefined) return { ok: true };
    if (code && KEY_REJECTED.has(code)) {
      return {
        ok: false,
        message: `Rendex rejected the API key (${code}): ${
          body?.error?.message ?? "not accepted"
        }. Check the key in Dashboard → Keys.`,
      };
    }
    if (body?.success === false && code) {
      // A schema-correct error from a recognised key (rate limit, usage cap, plan).
      return { ok: true };
    }
    return {
      ok: false,
      message: `Rendex returned an unexpected response (HTTP ${res.status}) for the account probe.`,
    };
  },
};

export default apiKey;
