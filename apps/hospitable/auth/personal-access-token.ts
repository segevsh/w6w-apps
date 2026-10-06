import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, errorText } from "../lib/client.ts";

/**
 * Hospitable Personal Access Token (PAT) — `Authorization: Bearer <token>`.
 *
 * Verified 2026-10-06 against developer.hospitable.com (the Public API v2 OpenAPI document
 * declares one `Bearer-Authorization` http/bearer scheme) and a live unsigned probe of
 * `public.api.hospitable.com`. A Hospitable user generates a PAT inside the Hospitable app
 * (Apps > API access) to call the API for their own account. The API also supports OAuth2 for
 * approved vendor integrations; that path needs a partner-portal client and is not shipped here.
 *
 * The probe is `GET /v2/user` ("Get User & Billing"): it needs no listed scope, and the body is
 * the account holder's name, email and billing address — no token material. A missing and an
 * invalid token answer byte-identically (`401 {"message":"Unauthenticated."}`), so the verdict
 * comes from the body: only a `{"data": {…}}` document is a pass.
 */
export interface HospitableCredential {
  accessToken: string;
}

export const PROBE_PATH = "/user";

const personalAccessToken: AuthDefinition = {
  key: "personal-access-token",
  type: "bearer",
  displayName: "Personal Access Token",
  description: "Paste a Personal Access Token generated in the Hospitable app (Apps > API access).",
  connectionLabel: "Hospitable ({{account}})",
  fields: [
    {
      key: "accessToken",
      label: "Personal Access Token",
      type: "secret",
      required: true,
      hint: "Generate it in Hospitable under Apps > API access. A token's scopes decide which " +
        "actions work (for example `pat:read` / `pat:write`). Some endpoints also need a " +
        "Mogul plan or a Direct plan.",
    },
  ],

  sign({ request, credential }) {
    const { accessToken } = credential as Partial<HospitableCredential>;
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  async test({ credential }, ctx) {
    const token = ((credential as Partial<HospitableCredential>)?.accessToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => null) as
      | { data?: unknown; message?: unknown }
      | null;

    // The documented success shape — not merely a 2xx.
    if (res.ok && body && typeof body === "object" && body.data && typeof body.data === "object") {
      return { ok: true };
    }

    const text = errorText(body) ?? "";
    if (res.status === 401 || /unauthenticated|invalid token|expired/i.test(text)) {
      return {
        ok: false,
        message: `Hospitable rejected the token (HTTP ${res.status}${
          text ? ` — ${text}` : ""
        }). Check it was copied exactly and has not been revoked.`,
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `Hospitable refused the token (HTTP 403${text ? ` — ${text}` : ""}).`,
      };
    }
    if (res.ok) return { ok: false, message: "Hospitable answered without a user document" };
    return { ok: false, message: `Hospitable returned HTTP ${res.status} for ${PROBE_PATH}` };
  },

  /** Label the connection with the account holder's name (or email) — nothing else is kept. */
  async afterConnect({ credential }, ctx) {
    const token = ((credential as Partial<HospitableCredential>)?.accessToken ?? "").trim();
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
        headers: { accept: "application/json", authorization: `Bearer ${token}` },
      });
      if (!res.ok) return {};
      const body = await res.json() as { data?: { name?: string; email?: string } };
      const account = body?.data?.name || body?.data?.email;
      return account ? { account } : {};
    } catch {
      return {};
    }
  },
};

export default personalAccessToken;
