import type { AuthDefinition } from "@w6w/types";
import { API_URL, formatError, type TimelinesBody } from "../lib/client.ts";

interface WorkspaceBody extends TimelinesBody {
  data?: { workspace_id?: string; display_name?: string; plan?: string };
}

/**
 * TimelinesAI's workspace API token — read from the authentication guide 2026-10-06.
 *
 * Copied from app.timelines.ai → Integrations → Public API and sent as
 * `Authorization: Bearer <token>`. One token is one workspace; there is no OAuth flow and no
 * scopes. (The token is a UUID.)
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description:
    "A TimelinesAI workspace API token (app.timelines.ai → Integrations → Public API), sent as a Bearer token. One token = one workspace.",
  connectionLabel: "{{workspaceName}}",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Copy it from https://app.timelines.ai/integrations/api/ (Integrations → Public API).",
    },
  ],

  sign({ request, credential }) {
    const { apiToken } = credential as { apiToken: string };
    request.headers["authorization"] = `Bearer ${apiToken}`;
    return request;
  },

  /**
   * `GET /workspace` — workspace identity, plan and quota counters; it never contains the token
   * (contrast Mailjet's `/apikey`, which hands the caller's own secret back).
   *
   * Classified from the BODY, not the status code. A good token is `status: "ok"` with a `data`
   * object carrying a `workspace_id`. A refusal is `{status:"error", error_code}`; a missing
   * and a rejected token are both 401 and differ only by `missing_credentials` vs
   * `invalid_token` (measured live 2026-10-06). A 2xx with neither shape is not proof of a live
   * token and is refused.
   */
  async test({ credential }, ctx) {
    const { apiToken } = credential as { apiToken?: string };
    if (!apiToken) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_URL}/workspace`, {
      headers: { accept: "application/json", authorization: `Bearer ${apiToken}` },
    });
    const body = await res.json().catch(() => undefined) as WorkspaceBody | undefined;

    if (res.ok && body?.status === "ok" && body.data && typeof body.data === "object") {
      return { ok: true };
    }
    if (res.ok) {
      return { ok: false, message: "TimelinesAI answered 2xx with an unexpected body shape" };
    }
    return { ok: false, message: `TimelinesAI returned ${formatError(res.status, body)}` };
  },

  /** Label the Connection with the workspace's display name — identity only, never the token. */
  async afterConnect({ credential }, ctx) {
    const { apiToken } = credential as { apiToken?: string };
    if (!apiToken) return {};
    const res = await ctx.fetch(`${API_URL}/workspace`, {
      headers: { accept: "application/json", authorization: `Bearer ${apiToken}` },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => undefined) as WorkspaceBody | undefined;
    const ws = body?.data;
    if (!ws) return {};
    return { workspaceName: ws.display_name, workspaceId: ws.workspace_id, plan: ws.plan };
  },
};

export default apiToken;
