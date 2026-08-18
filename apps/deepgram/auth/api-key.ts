import type { AuthDefinition } from "@w6w/types";
import { BASE_URL } from "../lib/client.ts";

/**
 * A Deepgram API key, sent as `Authorization: Token` — **not** `Bearer`.
 *
 * That distinction is worth stating because Deepgram uses both: `Token` for a
 * long-lived API key and `Bearer` for the short-lived JWT that
 * `token-grant` mints. Sending the wrong scheme fails as an authentication
 * error rather than a malformed one.
 *
 * ## A key belongs to one project, and carries scopes
 *
 * The project is discovered at connect time, so no action asks for it. The
 * scopes — `owner`, `admin`, `member`, `usage:read` and so on — are chosen when
 * the key is created and cannot be changed afterwards, which means a key can
 * authenticate perfectly and be refused by the management endpoints while
 * transcribing happily. The test reports which project it reached so at least
 * the first half is visible.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "A Deepgram API key, sent as `Authorization: Token` (not Bearer). It belongs to one project, " +
    "and its scopes are fixed when the key is created.",
  connectionLabel: "Deepgram ({{projectName}})",
  apiKey: { in: "header", name: "Authorization", prefix: "Token " },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Deepgram Console → your project → API Keys. Give it only the scopes the workflow " +
        "needs — they cannot be changed later.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    // `Token`, not `Bearer`. Bearer is for the short-lived JWT from /v1/auth/grant.
    request.headers["authorization"] = `Token ${apiKey}`;
    return request;
  },

  /**
   * `GET /v1/projects` — proves the key works and names the project it belongs
   * to, which is the id every management path then needs.
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(`${BASE_URL}/v1/projects`, {
        headers: { authorization: `Token ${apiKey}`, accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach Deepgram: ${String(err)}` };
    }

    if (res.status === 401 || res.status === 403) {
      await res.body?.cancel();
      return {
        ok: false,
        message: "Deepgram rejected this API key, or it lacks the scope to list projects",
      };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { ok: false, message: `Deepgram returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as
      | { projects?: Array<{ project_id?: string; name?: string }> }
      | null;
    const projects = body?.projects ?? [];
    if (projects.length === 0) {
      return { ok: false, message: "the key authenticated but reaches no project" };
    }
    const names = projects.map((p) => p.name ?? p.project_id).join(", ");
    return {
      ok: true,
      message: projects.length === 1
        ? `connected to the ${names} project`
        : `connected; this key reaches ${projects.length} projects (${names}) — the first is used`,
    };
  },

  /** Records the project. Never the key. */
  async afterConnect({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    try {
      const res = await ctx.fetch(`${BASE_URL}/v1/projects`, {
        headers: { authorization: `Token ${apiKey}`, accept: "application/json" },
      });
      if (!res.ok) {
        await res.body?.cancel();
        return {};
      }
      const body = await res.json().catch(() => null) as
        | { projects?: Array<{ project_id?: string; name?: string }> }
        | null;
      const project = body?.projects?.[0];
      if (!project?.project_id) return {};
      return {
        projectId: String(project.project_id),
        projectName: project.name ?? String(project.project_id),
      };
    } catch {
      return {};
    }
  },
};

export default apiKey;
