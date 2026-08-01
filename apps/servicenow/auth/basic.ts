import type { AuthDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

/**
 * Username + password (`basic`), ServiceNow's plain HTTP Basic scheme —
 * unlike Zendesk's, there is no special username suffix here.
 *
 * The instance identifies the account, so — same reasoning as Zendesk's
 * subdomain — it is collected here as a Connection field rather than as an
 * Action param, and `afterConnect` echoes it onto the connection's `display`,
 * which is where `lib/client.ts` reads it from.
 *
 * `username`/`password` here are the credential of a real ServiceNow user
 * record (or a dedicated integration user), not a separately-issued API
 * token — ServiceNow's Table API authenticates the same way an interactive
 * login would.
 */
const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "Username & Password",
  description:
    "A ServiceNow user (ideally a dedicated integration account) with a role granting Table API access.",
  connectionLabel: "{{username}} ({{instance}})",
  fields: [
    {
      key: "instance",
      label: "Instance",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "Just the instance name from `acme.service-now.com` — not the full URL.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
    { key: "username", label: "Username", type: "string", required: true, row: "creds" },
    { key: "password", label: "Password", type: "secret", required: true, row: "creds" },
  ],

  sign({ request, credential }) {
    const { username, password } = credential as { username: string; password: string };
    request.headers["authorization"] = `Basic ${btoa(`${username}:${password}`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { instance, username, password } = credential as {
      instance?: string;
      username?: string;
      password?: string;
    };
    if (!instance || !username || !password) {
      return { ok: false, message: "credential missing instance, username or password" };
    }
    // sys_user_role is the same table n8n's credential test probes: a small,
    // near-universally-readable table that proves the account can reach the
    // Table API at all.
    const res = await ctx.fetch(
      `${baseUrl(instance)}/api/now/table/sys_user_role?sysparm_limit=1`,
      { headers: { authorization: `Basic ${btoa(`${username}:${password}`)}` } },
    );
    if (!res.ok) return { ok: false, message: `ServiceNow returned ${res.status}` };
    return { ok: true };
  },

  /**
   * No extra "who am I" round trip is needed — the instance and username are
   * already sitting in the credential the user just typed in, so recording
   * them here is free.
   */
  afterConnect({ credential }) {
    const { instance, username } = credential as { instance?: string; username?: string };
    return Promise.resolve(instance ? { instance, username } : {});
  },
};

export default basic;
