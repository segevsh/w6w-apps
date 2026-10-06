import type { AuthDefinition } from "@w6w/types";
import { bearer, probe } from "./probe.ts";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * SavvyCal personal access token — `Authorization: Bearer pt_secret_…`.
 *
 * Verified on developers.savvycal.com/authentication (2026-10-06): created under
 * Settings > Developers, used with the `Bearer` realm against
 * `https://api.savvycal.com/v1`. It acts as the user who created it.
 */
export interface SavvyCalToken {
  token: string;
}

const personalAccessToken: AuthDefinition = {
  key: "personal-access-token",
  type: "bearer",
  displayName: "Personal Access Token",
  description:
    "Create a token in SavvyCal under Settings > Developers > Create a token. It acts as you; " +
    "use OAuth instead to act on behalf of other users.",
  connectionLabel: "SavvyCal ({{email}})",
  fields: [{
    key: "token",
    label: "Personal access token",
    type: "secret",
    required: true,
    placeholder: "pt_secret_…",
    hint: "SavvyCal > Settings > Developers > Create a token.",
  }],

  sign({ request, credential }) {
    const { token } = credential as Partial<SavvyCalToken>;
    for (const [k, v] of Object.entries(bearer(token ?? ""))) request.headers[k] = v;
    return request;
  },

  async test({ credential }, ctx) {
    const token = String((credential as Partial<SavvyCalToken>)?.token ?? "").trim();
    if (!token) return { ok: false, message: "credential missing token" };
    const result = await probe(ctx, token);
    return result.ok ? { ok: true } : { ok: false, message: result.message };
  },

  /** Publish the account's email and id for the Connection label — nothing else. */
  async afterConnect({ credential }, ctx) {
    const token = String((credential as Partial<SavvyCalToken>)?.token ?? "").trim();
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/me`, {
        headers: { accept: "application/json", ...bearer(token) },
      });
      if (!res.ok) return {};
      const me = await res.json() as { id?: string; email?: string };
      return { email: me.email, userId: me.id };
    } catch {
      return {};
    }
  },
};

export default personalAccessToken;
