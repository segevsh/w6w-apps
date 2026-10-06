import type { AuthDefinition } from "@w6w/types";
import { API_BASE, errorText, isEnvelope } from "../lib/client.ts";

/**
 * VBOUT API key — the `key` query parameter.
 *
 * Every sample in VBOUT's documentation is `…/<action>.json?key={YOUR_API_ID}`; the OpenAPI
 * document declares no security scheme at all, so the Quickstart and the samples are the
 * authority. There are two kinds of key: the User Key (Account Settings; full access, cannot be
 * rotated) and an Application Key (limited access, deletable). Both travel the same way.
 *
 * ## The probe is `GET app/me.json`
 *
 * It needs a credential, needs no id, and returns only business details
 * (`id`, `businessName`, `contactName`, `phoneNumber`, `vboutName`, `package`), never the key.
 *
 * ## The status is not the verdict
 *
 * A pass is an envelope with `header.status: "ok"` whose `data.business` exists. An
 * unauthenticated call answers `401` + `errorCode 1000` (measured 2026-10-06) while the
 * Quickstart's recorded bad-key answer is `errorCode 1002`; both are read from the body.
 */
export interface VboutCredential {
  apiKey: string;
}

export const PROBE_PATH = "app/me.json";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Your VBOUT API key (Account Settings > API Integrations). Travels as the `key` " +
    "query parameter on every request.",
  connectionLabel: "{{business.businessName}}",
  apiKey: { in: "query", name: "key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Generate or copy it from your VBOUT account. A User Key has full access; an " +
        "Application Key has limited access and can be deleted at any time.",
    },
  ],

  /** The only hook handed the raw credential; network-less, it stamps the query parameter. */
  sign({ request, credential }) {
    const { apiKey } = credential as Partial<VboutCredential>;
    const url = new URL(request.url);
    url.searchParams.set("key", (apiKey ?? "").trim());
    request.url = url.toString();
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as Partial<VboutCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    // `sign` only auto-applies to action traffic, so the key is added by hand here.
    const url = new URL(`${API_BASE}/${PROBE_PATH}`);
    url.searchParams.set("key", key);
    const res = await ctx.fetch(url.toString(), { headers: { accept: "application/json" } });
    const body = await res.json().catch(() => null) as unknown;

    if (!isEnvelope(body)) {
      return {
        ok: false,
        message: `VBOUT answered ${res.status} but not with its documented response envelope.`,
      };
    }
    if (body.response.header.status !== "ok") {
      const msg = errorText(body);
      if (res.status === 429) {
        return {
          ok: false,
          message: "VBOUT rate-limited the check (429); the key was not judged.",
        };
      }
      return {
        ok: false,
        message: `VBOUT refused the key (${res.status}${msg ? ` ${msg}` : ""}). Check it was ` +
          "copied exactly.",
      };
    }
    const data = body.response.data as { business?: unknown } | null;
    if (!data?.business) {
      return { ok: false, message: "VBOUT answered ok but returned no business details." };
    }
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const key = ((credential as Partial<VboutCredential>)?.apiKey ?? "").trim();
    if (!key) return {};
    const url = new URL(`${API_BASE}/${PROBE_PATH}`);
    url.searchParams.set("key", key);
    const res = await ctx.fetch(url.toString(), { headers: { accept: "application/json" } });
    const body = await res.json().catch(() => null) as unknown;
    if (!isEnvelope(body) || body.response.header.status !== "ok") return {};
    const biz = (body.response.data as { business?: Record<string, unknown> }).business ?? {};
    const name = biz.businessName ?? biz.businessname;
    return typeof name === "string" ? { business: { businessName: name } } : {};
  },
};

export default apiKey;
