import type { AuthDefinition } from "@w6w/types";
import { API_VERSION, BASE_URL } from "../lib/client.ts";

/**
 * A personal access token, sent as HTTP Basic with an **empty username** and
 * the token as the password.
 *
 * That shape is unusual enough to state: `Basic base64(":" + token)`. Most APIs
 * that use Basic put the credential in the username; Azure DevOps puts it in
 * the password and leaves the username blank.
 *
 * ## Scopes are per area, and a missing one looks like a missing project
 *
 * A token is granted scopes per area — Code, Build, Work Items, Project and
 * Team — and a token without the right one **authenticates perfectly and then
 * answers `404`** for resources it cannot see. So "the project does not exist"
 * and "this token cannot read that project" are the same response, and the
 * fix for the second is not in the API.
 *
 * The connection test therefore reads the projects it *can* see and names them,
 * which turns a scope problem into something visible at connect time.
 *
 * ## A rejected token answers `302`
 *
 * Not `401`. Azure DevOps redirects to an interactive sign-in page, so
 * anything following redirects sees `200` and a page of HTML. This hook, like
 * the client, sends `redirect: "manual"` and treats a 3xx as a rejection.
 */
const pat: AuthDefinition = {
  key: "pat",
  type: "basic",
  displayName: "Personal Access Token",
  description:
    "An Azure DevOps personal access token, sent as Basic auth with an EMPTY username. Its " +
    "per-area scopes decide what it can see — and a missing scope answers 404, not 403.",
  connectionLabel: "Azure DevOps ({{organization}})",
  fields: [
    {
      key: "organization",
      label: "Organization",
      type: "string",
      required: true,
      placeholder: "contoso",
      hint: "The name in `dev.azure.com/<organization>`. Every path is scoped to it.",
    },
    {
      key: "token",
      label: "Personal Access Token",
      type: "secret",
      required: true,
      hint: "User settings → Personal access tokens. Grant the areas the workflow needs — Code, " +
        "Build, Work Items — because a missing scope produces a 404 rather than a clear refusal.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    // An EMPTY username and the token as the password — the reverse of most
    // Basic-auth APIs.
    request.headers["authorization"] = `Basic ${btoa(`:${token}`)}`;
    return request;
  },

  /**
   * `GET /{org}/_apis/projects` — the cheapest call that proves the token
   * works, and the one that shows what its scopes actually reach.
   */
  async test({ credential }, ctx) {
    const { organization, token } = credential as { organization?: string; token?: string };
    if (!organization) return { ok: false, message: "credential missing the organization" };
    if (!token) return { ok: false, message: "credential missing the token" };

    const url = `${BASE_URL}/${encodeURIComponent(organization)}/_apis/projects` +
      `?api-version=${API_VERSION}&$top=100`;

    let res: Response;
    try {
      res = await ctx.fetch(url, {
        headers: { authorization: `Basic ${btoa(`:${token}`)}`, accept: "application/json" },
        // Following the redirect would turn a rejection into a page of HTML.
        redirect: "manual",
      });
    } catch (err) {
      return { ok: false, message: `could not reach Azure DevOps: ${String(err)}` };
    }

    if (res.status >= 300 && res.status < 400) {
      await res.body?.cancel();
      return {
        ok: false,
        message:
          "Azure DevOps redirected to a sign-in page, which is how it rejects a token — check " +
          "that the personal access token has not expired or been revoked",
      };
    }
    if (res.status === 401 || res.status === 403) {
      await res.body?.cancel();
      return { ok: false, message: "Azure DevOps rejected this token" };
    }
    if (res.status === 404) {
      await res.body?.cancel();
      return {
        ok: false,
        message: `no organization named "${organization}" answered — check the name in ` +
          "dev.azure.com/<organization>",
      };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { ok: false, message: `Azure DevOps returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as
      | { count?: number; value?: Array<{ name?: string }> }
      | null;
    const projects = body?.value ?? [];
    if (projects.length === 0) {
      // Authenticated and blind: almost always a missing Project and Team scope.
      return {
        ok: true,
        message:
          `connected to ${organization}, but this token can see no projects — usually a missing ` +
          "Project and Team (read) scope rather than an empty organization",
      };
    }
    const names = projects.slice(0, 3).map((p) => p.name).filter(Boolean).join(", ");
    return {
      ok: true,
      message: `connected to ${organization} — ${projects.length} projects visible (${names}${
        projects.length > 3 ? ", …" : ""
      })`,
    };
  },

  /** Records the organization. Never the token. */
  afterConnect({ credential }) {
    const { organization } = credential as { organization: string };
    return { organization };
  },
};

export default pat;
