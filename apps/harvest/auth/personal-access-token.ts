import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Harvest Personal Access Token. Generate one at
 * `id.getharvest.com/developers` — Harvest hands you the Account ID
 * alongside the token in the same step, because every API v2 request needs
 * both: the token identifies the *user*, and `Harvest-Account-Id` identifies
 * *which* Harvest account the token is scoped to (a personal access token
 * is scoped to exactly one).
 */
const personalAccessToken: AuthDefinition = {
  key: "personal-access-token",
  type: "apiKey",
  displayName: "Personal Access Token",
  description: "Paste the Account ID and Access Token from id.getharvest.com/developers.",
  // Declares the primary credential header; `sign` below additionally stamps
  // `Harvest-Account-Id`, which every v2 request needs alongside it and which
  // the single-header `apiKey` config shape has no field for.
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      hint: "Shown next to the token at id.getharvest.com/developers.",
    },
    {
      key: "accessToken",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "id.getharvest.com/developers → Create New Personal Access Token.",
    },
  ],

  sign({ request, credential }) {
    const { accountId, accessToken } = credential as { accountId: string; accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    request.headers["harvest-account-id"] = accountId;
    return request;
  },

  async test({ credential }, ctx) {
    const { accountId, accessToken } = credential as {
      accountId?: string;
      accessToken?: string;
    };
    if (!accountId || !accessToken) {
      return { ok: false, message: "credential missing accountId or accessToken" };
    }
    // /users/me needs no special scope, so a narrowly-scoped token still
    // passes its own liveness check.
    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
        "harvest-account-id": accountId,
      },
    });
    if (!res.ok) return { ok: false, message: `Harvest returned ${res.status}` };
    return { ok: true };
  },
};

export default personalAccessToken;
