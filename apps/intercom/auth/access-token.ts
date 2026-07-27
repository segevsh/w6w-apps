import type { AuthDefinition } from "@w6w/types";
import { API_URL, INTERCOM_VERSION } from "../lib/client.ts";

/**
 * Intercom Access Token (`bearer`). Every workspace has a personal access token
 * under Settings → Developers → Developer Hub → your app → Authentication, or a
 * short-lived token for a single workspace. Every request signs with
 * `Authorization: Bearer <token>`.
 */
const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Access Token",
  description:
    "Paste an Intercom access token from the Developer Hub (your app → Authentication → Access token).",
  fields: [
    {
      key: "accessToken",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "Developer Hub → your app → Authentication → Access token.",
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
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: "application/json",
        "intercom-version": INTERCOM_VERSION,
      },
    });
    if (!res.ok) return { ok: false, message: `Intercom returned ${res.status}` };
    return { ok: true };
  },
};

export default accessToken;
