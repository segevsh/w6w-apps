import type { AuthDefinition } from "@w6w/types";
import { resolveApiBase } from "../lib/client.ts";

/**
 * Personal / Project / Group Access Token (`custom`).
 *
 * GitLab tokens are NOT sent as a Bearer credential — they ride in GitLab's own
 * `PRIVATE-TOKEN` request header, which is why this method is `type: "custom"`
 * (like other apps whose scheme isn't `Authorization: Bearer …`) and injects
 * the header itself in `sign`.
 *
 * The instance is per-connection. `baseUrl` defaults to `https://gitlab.com`
 * (SaaS); point it at a self-managed instance to target that host instead. It
 * is republished as `connection.display.baseUrl` so action and health code —
 * which only see the redacted connection — can resolve the API base without
 * ever touching the credential. NOTE: a self-managed host must also be on the
 * connection's egress allowlist, since `network.allow` ships only `gitlab.com`.
 */
const accessToken: AuthDefinition = {
  key: "access-token",
  type: "custom",
  displayName: "Access Token",
  description:
    "Paste a GitLab personal, project, or group access token. Sent in the PRIVATE-TOKEN header.",
  connectionLabel: "{{user.username}}",
  fields: [
    {
      key: "accessToken",
      label: "Access Token",
      type: "secret",
      required: true,
      hint:
        "Profile → Access Tokens → Add new token, with the `api` (or `read_api`) scope for what you use.",
    },
    {
      key: "baseUrl",
      label: "Instance URL",
      type: "string",
      required: false,
      placeholder: "https://gitlab.com",
      hint:
        "Leave blank for GitLab.com. For a self-managed instance enter its root URL — and add that host to this connection's egress allowlist.",
    },
  ],

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["private-token"] = accessToken;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken, baseUrl } = credential as { accessToken?: string; baseUrl?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${resolveApiBase(baseUrl)}/user`, {
      headers: { "private-token": accessToken },
    });
    if (!res.ok) return { ok: false, message: `GitLab returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { baseUrl } = credential as { baseUrl?: string };
    const res = await ctx.fetch(`${resolveApiBase(baseUrl)}/user`);
    let user: { id?: number; username?: string; name?: string } = {};
    if (res.ok) {
      user = await res.json().catch(() => ({})) as typeof user;
    }
    return {
      baseUrl: (baseUrl ?? "").trim() || "https://gitlab.com",
      user: { id: user.id, username: user.username, name: user.name },
    };
  },
};

export default accessToken;
