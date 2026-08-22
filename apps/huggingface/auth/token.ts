import type { AuthDefinition } from "@w6w/types";
import { describeError, HUB } from "../lib/client.ts";

/**
 * A Hugging Face access token.
 *
 * ## Two kinds, and the newer one is the one to use
 *
 * **Classic** tokens are `read` or `write` across everything the account can
 * reach — every repository, every organisation it belongs to.
 *
 * **Fine-grained** tokens name individual repositories and individual
 * permissions. They are the right choice for a workflow, and they fail
 * differently: a fine-grained token that does not list a repository returns
 * **403 on that repository** while working perfectly elsewhere, which reads as
 * an intermittent fault until somebody checks the token's scope. `whoami`
 * reports what it actually covers.
 *
 * ## The rejection message is misleading
 *
 * A bad token returns `{"error":"Invalid username or password."}` — verified
 * live. There is no username and no password involved; it is the same message
 * a failed web login gets, and it says nothing about tokens. The error handler
 * says so wherever it appears.
 *
 * ## A token cannot accept a gate
 *
 * Gated repositories require a person to agree to terms in the web interface.
 * No token, of any kind, at any permission level, can do that — so a 403 on a
 * gated repository is not a credential problem and rotating the token will not
 * fix it.
 */
const token: AuthDefinition = {
  key: "token",
  type: "bearer",
  displayName: "Access Token",
  description:
    "A Hugging Face access token. Prefer a FINE-GRAINED one: it names the repositories it can " +
    "reach, and a repository it omits returns 403 while everything else works.",
  connectionLabel: "{{name}}",
  fields: [
    {
      key: "token",
      label: "Access Token",
      type: "secret",
      required: true,
      placeholder: "hf_…",
      hint: "huggingface.co → Settings → Access Tokens. Fine-grained tokens list the " +
        "repositories and permissions they cover; classic ones are read or write across " +
        "everything the account can reach.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  /**
   * `GET /api/whoami-v2` — identity and, more usefully, the token's own scope.
   */
  async test({ credential }, ctx) {
    const { token } = credential as { token?: string };
    if (!token) return { ok: false, message: "credential missing the access token" };

    let res: Response;
    try {
      res = await ctx.fetch(`${HUB}/api/whoami-v2`, {
        headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach huggingface.co: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, message: describeError(res.status, text) };

    interface WhoAmI {
      name?: string;
      type?: string;
      orgs?: Array<{ name?: string }>;
      auth?: { accessToken?: { role?: string; displayName?: string } };
    }
    let body: WhoAmI | null = null;
    try {
      body = JSON.parse(text) as WhoAmI;
    } catch {
      return { ok: false, message: "Hugging Face did not return JSON" };
    }

    const role = body?.auth?.accessToken?.role;
    const orgs = body?.orgs?.length ?? 0;
    return {
      ok: true,
      message: `connected as ${body?.name ?? "an account"}` +
        (role ? ` with ${role} access` : "") +
        (orgs > 0 ? `, in ${orgs} organisation${orgs === 1 ? "" : "s"}` : ""),
    };
  },

  async afterConnect({ credential }, ctx) {
    const { token } = credential as { token?: string };
    if (!token) return {};

    let res: Response;
    try {
      res = await ctx.fetch(`${HUB}/api/whoami-v2`, {
        headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      });
    } catch {
      return {};
    }
    if (!res.ok) {
      await res.body?.cancel();
      return {};
    }

    const body = await res.json().catch(() => null) as {
      name?: string;
      type?: string;
      orgs?: Array<{ name?: string }>;
      auth?: { accessToken?: { role?: string } };
    } | null;

    return {
      name: body?.name,
      accountType: body?.type,
      // What the token may actually do, so a later 403 makes sense.
      role: body?.auth?.accessToken?.role,
      orgs: (body?.orgs ?? []).map((org) => org?.name).filter(Boolean),
    };
  },
};

export default token;
