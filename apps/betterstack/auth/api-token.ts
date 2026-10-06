import type { AuthDefinition } from "@w6w/types";
import { API_BASE, errorMessage, V2 } from "../lib/client.ts";

/**
 * Better Stack Uptime API token — `Authorization: Bearer <token>`.
 *
 * Two token kinds work (reference: "Getting started with the Uptime API"):
 * a **team-scoped Uptime API token** (Better Stack > API tokens > Team-based
 * tokens > Uptime API tokens) and a **global API token** valid across teams.
 * A global token needs `team_name` on every create call to say which team owns
 * the new resource; the create actions expose it.
 *
 * ## The probe
 *
 * `GET /api/v2/monitor-groups?per_page=1`: it needs a credential (measured
 * 2026-10-06: a bogus bearer token answers 401 `{"errors":"Invalid Team API
 * token…"}`, while the unknown path `/api/v2/nope` answers 404 `{"errors":
 * "Endpoint GET /api/v2/nope does not exist."}` — so a 401 here is the auth
 * layer, not a missing route), and the response is group names only, with none
 * of the request headers / proxy settings a monitor read carries.
 *
 * The verdict comes from the body: Better Stack's rejection is the sentence
 * "Invalid … API token", and that sentence — not the bare status — is what
 * `test` classifies on. A missing and a wrong token answer byte-identically,
 * so the message cannot tell them apart and does not pretend to.
 */
export const PROBE_PATH = `${V2}/monitor-groups`;

export interface BetterStackCredential {
  apiToken: string;
}

export function authHeaders(credential: Partial<BetterStackCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiToken ?? ""}` };
}

const REJECTED = /invalid .*api token/i;

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description:
    "An Uptime API token (team-scoped) or a global API token, from Better Stack > API tokens.",
  connectionLabel: "Better Stack",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Better Stack > API tokens. Use a team-based Uptime API token for one team, or a " +
        "global token for all teams (then pass team_name when creating resources).",
    },
  ],

  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(
        authHeaders(credential as Partial<BetterStackCredential>),
      )
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const token = ((credential as Partial<BetterStackCredential>)?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}?per_page=1`, {
      headers: { accept: "application/json", ...authHeaders({ apiToken: token }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null);
    const vendor = errorMessage(body);
    if (vendor && REJECTED.test(vendor)) {
      return {
        ok: false,
        message: "Better Stack rejected the token (invalid or missing). Create an Uptime API " +
          "token under Better Stack > API tokens and reconnect.",
      };
    }
    return {
      ok: false,
      message: `Better Stack returned HTTP ${res.status} for ${PROBE_PATH}` +
        `${vendor ? `: ${vendor}` : ""}`,
    };
  },
};

export default apiToken;
