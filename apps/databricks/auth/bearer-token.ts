import type { AuthDefinition } from "@w6w/types";

/**
 * Personal Access Token (`apiKey`).
 *
 * Verified against n8n's `DatabricksApi.credentials.ts` (its own credential
 * type for this exact vendor): `Authorization: Bearer <token>`, and its own
 * credential test hits `GET /api/2.0/preview/scim/v2/Me` — the SCIM
 * "current user" endpoint, needs no workspace-specific permission beyond
 * being a valid user, so it works as a liveness probe for any token.
 *
 * `workspaceUrl` is the workspace's full host, e.g.
 * `https://adb-1234567890123456.7.azuredatabricks.net` — Databricks shows
 * this in the browser URL bar and in workspace settings. It is recorded on
 * the connection in `afterConnect` so every action can build request URLs
 * from it without ever seeing the credential.
 */
const bearerToken: AuthDefinition = {
  key: "bearer-token",
  type: "apiKey",
  displayName: "Personal Access Token",
  description:
    "A workspace URL and a Personal Access Token generated from your Databricks user settings.",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "workspaceUrl",
      label: "Workspace URL",
      type: "string",
      required: true,
      placeholder: "https://adb-1234567890123456.7.azuredatabricks.net",
      hint: "The full URL from your browser's address bar while in the workspace.",
    },
    {
      key: "accessToken",
      label: "Personal Access Token",
      type: "secret",
      required: true,
      hint: "User Settings → Developer → Access tokens → Generate new token.",
    },
  ],

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { workspaceUrl, accessToken } = credential as {
      workspaceUrl?: string;
      accessToken?: string;
    };
    if (!workspaceUrl || !accessToken) {
      return { ok: false, message: "credential missing workspaceUrl or accessToken" };
    }
    const res = await ctx.fetch(
      `${workspaceUrl.replace(/\/+$/, "")}/api/2.0/preview/scim/v2/Me`,
      { headers: { authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return { ok: false, message: `Databricks returned ${res.status}` };
    return { ok: true };
  },

  /** Records the workspace URL on the connection so the client can build requests without the credential. */
  afterConnect({ credential }) {
    const { workspaceUrl } = credential as { workspaceUrl?: string };
    if (!workspaceUrl) return {};
    return { workspaceUrl: workspaceUrl.replace(/\/+$/, "") };
  },
};

export default bearerToken;
