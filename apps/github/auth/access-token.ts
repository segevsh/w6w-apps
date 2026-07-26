import type { AuthDefinition } from "@w6w/types";
import { API_URL, API_VERSION } from "../lib/client.ts";

/**
 * Personal Access Token (`bearer`).
 *
 * Works with both token families. A fine-grained PAT (`github_pat_…`) is scoped
 * to chosen repositories and permissions and is the better default; a classic
 * PAT (`ghp_…`) is scoped by the coarse `repo` / `workflow` scopes. Both are
 * sent as `Authorization: Bearer <token>`.
 *
 * n8n's credential also exposes a `server` field for GitHub Enterprise Server.
 * It is omitted here: the egress allowlist in `package.json` is static, so an
 * Enterprise host would be blocked by the runtime anyway. Publish a variant of
 * this app declaring that host to target Enterprise.
 */
const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Personal Access Token",
  description: "Paste a fine-grained or classic PAT from GitHub → Settings → Developer settings.",
  connectionLabel: "{{user.login}}",
  fields: [
    {
      key: "accessToken",
      label: "Access Token",
      type: "secret",
      required: true,
      hint:
        "Settings → Developer settings → Personal access tokens. Fine-grained tokens need Contents/Issues/Pull requests permissions for what you use.",
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
    const res = await ctx.fetch(`${API_URL}/user`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": API_VERSION,
      },
    });
    if (!res.ok) return { ok: false, message: `GitHub returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/user`, {
      headers: { accept: "application/vnd.github+json" },
    });
    if (!res.ok) return {};
    const me = await res.json().catch(() => ({})) as {
      id?: number;
      login?: string;
      name?: string;
    };
    return { user: { id: me.id, login: me.login, name: me.name } };
  },
};

export default accessToken;
