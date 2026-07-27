import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Typeform personal access token (`bearer`). Generate one under
 * https://admin.typeform.com/account#/section/tokens and paste it here. Every
 * request signs with `Authorization: Bearer <token>`.
 *
 * Typeform accepts both `Bearer` and `bearer`; we send the canonical capitalised
 * scheme, which the API treats identically.
 */
const personalAccessToken: AuthDefinition = {
  key: "personal-access-token",
  type: "bearer",
  displayName: "Personal Access Token",
  description:
    "Paste a personal access token generated at https://admin.typeform.com/account#/section/tokens.",
  fields: [
    {
      key: "accessToken",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "Typeform → Settings → Personal tokens → Generate a new token.",
    },
  ],

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Typeform returned ${res.status}` };
    return { ok: true };
  },
};

export default personalAccessToken;
