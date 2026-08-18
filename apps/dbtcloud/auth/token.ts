import type { AuthDefinition } from "@w6w/types";
import { normalizeAccessUrl } from "../lib/client.ts";

/**
 * A dbt Cloud API token, sent as `Authorization: Bearer`.
 *
 * ## Two kinds of token, and the difference matters
 *
 *   - A **service token** belongs to the account and carries permission sets
 *     you grant it. It is the right choice for automation: it survives people
 *     leaving, and it can be scoped to *Job Admin* or *Read-Only* rather than
 *     everything.
 *   - A **personal access token** carries one person's permissions, and
 *     everything the workflow does is attributed to them. It stops working the
 *     day they leave.
 *
 * Both authenticate identically, so this field takes either — but the hint says
 * which one belongs in a workflow.
 *
 * ## The Access URL is not optional guesswork
 *
 * dbt Cloud runs in cells and an account lives in exactly one. Presenting a
 * valid token to the wrong cell answers `401 Invalid token.` — indistinguishable
 * from a bad token, and the reason this asks rather than guesses.
 */
const token: AuthDefinition = {
  key: "token",
  type: "apiKey",
  displayName: "API Token",
  description:
    "A dbt Cloud service token (preferred) or personal access token, plus the account's Access " +
    "URL — a token presented to the wrong region answers 401 exactly like a bad token.",
  connectionLabel: "dbt Cloud ({{accountName}})",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "token",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Account Settings → Service tokens (preferred — it survives the person who made it), " +
        "or Personal tokens.",
    },
    {
      key: "accessUrl",
      label: "Access URL",
      type: "string",
      required: false,
      placeholder: "ab123.us1.dbt.com",
      hint: "From Account Settings. Leave blank only for the legacy cloud.getdbt.com host. " +
        "Paths are ignored — the origin is what matters.",
    },
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: false,
      hint: "Optional. Left blank, it is discovered when the connection is tested — set it only " +
        "if the token can reach several accounts.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  /**
   * `GET /api/v2/accounts/` — the one call that both proves the token works and
   * discovers the account id every other path needs.
   *
   * A `401` here is deliberately reported with both possible causes, because
   * "the token is wrong" and "the token is right and the Access URL points at
   * another region" produce the identical response and have different fixes.
   */
  async test({ credential }, ctx) {
    const { token, accessUrl } = credential as { token?: string; accessUrl?: string };
    if (!token) return { ok: false, message: "credential missing token" };

    const base = normalizeAccessUrl(accessUrl);
    let res: Response;
    try {
      res = await ctx.fetch(`${base}/api/v2/accounts/`, {
        headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${base}: ${String(err)}` };
    }

    if (res.status === 401) {
      await res.body?.cancel();
      return {
        ok: false,
        message:
          `${base} rejected this token — either the token is wrong, or it belongs to a different ` +
          "dbt Cloud region and this Access URL is not its own",
      };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { ok: false, message: `dbt Cloud returned ${res.status} from ${base}` };
    }

    const body = await res.json().catch(() => null) as
      | { data?: Array<{ id?: number; name?: string }> }
      | null;
    const accounts = body?.data ?? [];
    if (accounts.length === 0) {
      return {
        ok: false,
        message: "the token authenticated but can see no account — check its permission sets",
      };
    }
    const names = accounts.map((a) => a.name ?? String(a.id)).join(", ");
    return {
      ok: true,
      message: accounts.length === 1
        ? `connected to ${names} at ${base}`
        : `connected at ${base}; the token reaches ${accounts.length} accounts (${names}) — set ` +
          "an Account ID to choose one",
    };
  },

  /**
   * Records the Access URL and the account, so no action has to ask for either.
   * Never the token.
   */
  async afterConnect({ credential }, ctx) {
    const { token, accessUrl, accountId } = credential as {
      token: string;
      accessUrl?: string;
      accountId?: string;
    };
    const base = normalizeAccessUrl(accessUrl);
    const display: Record<string, unknown> = { accessUrl: base };

    const chosen = String(accountId ?? "").trim();
    if (chosen) display.accountId = chosen;

    try {
      const res = await ctx.fetch(`${base}/api/v2/accounts/`, {
        headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      });
      if (res.ok) {
        const body = await res.json().catch(() => null) as
          | { data?: Array<{ id?: number; name?: string }> }
          | null;
        const accounts = body?.data ?? [];
        const account = chosen ? accounts.find((a) => String(a.id) === chosen) : accounts[0];
        if (account) {
          display.accountId = String(account.id);
          display.accountName = account.name ?? String(account.id);
        }
      } else {
        await res.body?.cancel();
      }
    } catch { /* the test hook already reported reachability */ }

    return display;
  },
};

export default token;
