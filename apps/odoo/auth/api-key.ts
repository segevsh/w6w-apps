import type { AuthDefinition, HookContext, SignableRequest } from "@w6w/types";
import {
  buildCommonBody,
  buildExecuteKwBody,
  COMMON_SERVICE,
  jsonRpcUrl,
  OBJECT_SERVICE,
  resolveInstanceUrl,
  SIGNED_ARG_COUNT,
  UNSIGNED_ARG_COUNT,
  unwrapRpc,
} from "../lib/client.ts";

/**
 * Odoo login + API key, carried INSIDE the JSON-RPC request body.
 *
 * ## The unusual bit, stated precisely
 *
 * Almost every app in this pack signs by setting a header. Odoo's `/jsonrpc`
 * endpoint cannot be signed that way, because it does not authenticate the
 * *request* — it authenticates the *call*. Credentials are three POSITIONAL
 * arguments of `execute_kw` itself:
 *
 *     execute_kw(db, uid, password, model, method, args, kwargs)
 *      *          ^^  ^^^  ^^^^^^^^
 *
 * There is no `Authorization` header to set; sending one changes nothing.
 *
 * This is still perfectly expressible under the sandbox rules, because
 * `SignableRequest` exposes `body` and `sign` may rewrite it. So the split is:
 *
 *   - the **action** builds a four-element, credential-free envelope
 *     `[model, method, args, kwargs]` — it names what to call and never learns
 *     who is calling;
 *   - **`sign`** — the only code handed the credential, running network-less —
 *     unshifts `[db, uid, password]` onto the front, producing the seven-element
 *     form Odoo expects.
 *
 * The invariant "actions never see credentials" is preserved exactly. What
 * changes is only *where* on the request the credential lands.
 *
 * ## Why `type: "custom"`
 *
 * The credential is conceptually an API key, but `ApiKeyConfig` can only say
 * "put this value, with this prefix, into this header / query / body slot". It
 * cannot express "insert into positional slot 2 of a nested JSON array, and
 * insert a separately-resolved uid into slot 1". Declaring `type: "apiKey"`
 * would therefore describe a wire format this app does not use and a host could
 * not reproduce. `custom` plus an explicit `sign` hook is the accurate one.
 *
 * ## Why `exchange` resolves a uid at connect time
 *
 * `execute_kw` wants a numeric **uid**, not a login. Odoo resolves login →
 * uid via `common.authenticate`, which is a network call — and `sign` is
 * network-less by design, so it cannot do it. Re-resolving on every action would
 * also double every workflow's RPC traffic.
 *
 * So `exchange` performs the authentication ONCE at connect time and stores the
 * uid alongside the key in the opaque credential. `sign` then has everything it
 * needs locally. This also makes connecting fail fast and legibly: a wrong
 * database name or a user without a local password is rejected while the user
 * is still looking at the form, rather than on the first workflow run.
 *
 * ## Use an API key, not the account password
 *
 * Both work — Odoo's docs are explicit that "The way to use API Keys in your
 * scripts is to simply replace your password by the key. The login remains
 * in-use." An API key is strongly preferred here and the field is labelled for
 * it: keys are individually revocable, carry a mandatory expiry (Odoo caps them
 * at three months), and cannot be used to log into the web UI.
 *
 * There is a second, host-specific reason spelled out in the README: because
 * the credential travels as a positional array element rather than under a key
 * named `password`, the runtime's egress-capture redaction — which masks by key
 * name — does not mask it. A short-lived, revocable, minimally-scoped key is a
 * materially better thing to have in that position than a human's password.
 *
 * ## Odoo Online users have no local password by default
 *
 * Odoo's own documentation flags this and it is the single most common reason a
 * connection fails: "For Odoo Online instances (<domain>.odoo.com), users are
 * created without a local password (as a person you are logged in via the Odoo
 * Online authentication system, not by the instance itself)." Minting an API key
 * from Preferences → Account Security solves it without setting a password at
 * all, which is the flow this app's hints steer people to.
 */

interface OdooCredential {
  instanceUrl: string;
  database: string;
  username: string;
  apiKey: string;
  uid?: number;
  serverVersion?: string;
}

/**
 * Resolve login → uid via the unauthenticated `common` service.
 *
 * `common.authenticate(db, login, password, {})` returns the integer uid, or
 * `false` when the credentials are wrong. Verified live against an Odoo Online
 * instance on 2026-08-03: a good triple returned `{"result": 2}`.
 *
 * Note it returns `false` rather than raising, so a falsy check — not a
 * try/catch — is what distinguishes "wrong credentials" from "server broken".
 */
async function authenticate(
  ctx: HookContext,
  cred: Pick<OdooCredential, "instanceUrl" | "database" | "username" | "apiKey">,
): Promise<number | false> {
  const res = await ctx.fetch(jsonRpcUrl(cred.instanceUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "x-odoo-database": cred.database,
    },
    body: buildCommonBody("authenticate", [cred.database, cred.username, cred.apiKey, {}]),
  });
  const uid = unwrapRpc<number | false>(res.status, await res.text());
  return typeof uid === "number" && uid > 0 ? uid : false;
}

/** Read the instance's server version — used only to label the Connection. */
async function serverVersion(ctx: HookContext, cred: OdooCredential): Promise<string | undefined> {
  try {
    const res = await ctx.fetch(jsonRpcUrl(cred.instanceUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-odoo-database": cred.database,
      },
      body: buildCommonBody("version", []),
    });
    const info = unwrapRpc<{ server_version?: string }>(res.status, await res.text());
    return info?.server_version;
  } catch {
    // Cosmetic only — a Connection with an unknown version label is fine.
    return undefined;
  }
}

/**
 * Insert the credential triple into an `execute_kw` envelope.
 *
 * Exported and pure so the `sign` hook and the unit tests exercise the SAME
 * code path. A second, hand-rolled copy inside a test is exactly how an
 * argument-ordering bug gets a passing test suite.
 *
 * Behaviour, and why each branch is what it is:
 *
 *   - a four-element (unsigned) `execute_kw` envelope gets `[db, uid, password]`
 *     unshifted onto the front — the normal path;
 *   - an already-seven-element envelope is returned untouched, so signing is
 *     idempotent and a retried request cannot end up with six credential slots;
 *   - any other length on an `execute_kw` envelope THROWS. That can only mean
 *     the client and this hook have drifted apart, and a malformed call is far
 *     better caught here than diagnosed later from an opaque Odoo error;
 *   - a body that is not an `execute_kw` envelope is returned untouched rather
 *     than rejected, so an unauthenticated `common` call is not broken by being
 *     routed through signing.
 */
export function signExecuteKw(body: string, cred: OdooCredential): string {
  let envelope: {
    params?: { service?: string; method?: string; args?: unknown[] };
  };
  try {
    envelope = JSON.parse(body);
  } catch {
    // Not JSON — nothing this hook understands, so leave it alone.
    return body;
  }

  const params = envelope?.params;
  if (
    !params || params.service !== OBJECT_SERVICE || params.method !== "execute_kw" ||
    !Array.isArray(params.args)
  ) {
    return body;
  }

  if (params.args.length === SIGNED_ARG_COUNT) return body;

  if (params.args.length !== UNSIGNED_ARG_COUNT) {
    throw new Error(
      `Odoo sign: expected ${UNSIGNED_ARG_COUNT} unsigned execute_kw args ` +
        `([model, method, args, kwargs]) but got ${params.args.length}`,
    );
  }

  if (!cred.uid) {
    throw new Error(
      "Odoo credential carries no uid — reconnect this connection so it can be resolved.",
    );
  }

  // THE ordering that matters: db, uid, password, then the call itself.
  params.args = [cred.database, cred.uid, cred.apiKey, ...params.args];
  return JSON.stringify(envelope);
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "custom",
  displayName: "API Key",
  description: "Connect to an Odoo instance with a login and an API key. Works with Odoo Online " +
    "(<name>.odoo.com) and self-hosted installs. Requires the external API, which Odoo " +
    "enables on Custom plans only.",
  connectionLabel: "{{username}} @ {{database}}",
  fields: [
    {
      key: "instanceUrl",
      label: "Instance URL",
      type: "string",
      required: true,
      placeholder: "https://mycompany.odoo.com",
      hint: "Your Odoo server's base URL. For Odoo Online this is `https://<name>.odoo.com`. " +
        "Paths are ignored — pasting the URL from your browser's address bar is fine.",
    },
    {
      key: "database",
      label: "Database",
      type: "string",
      required: true,
      placeholder: "mycompany",
      hint:
        "The Odoo database name. For Odoo Online it is usually the subdomain of your instance " +
        "URL. You can confirm it in Settings → Technical → Database Structure, or at the " +
        "bottom of your instance's login page.",
    },
    {
      key: "username",
      label: "Login",
      type: "string",
      required: true,
      placeholder: "bot@mycompany.com",
      hint:
        "The user's login (usually their email). Odoo recommends a dedicated bot user with only " +
        "the access rights the integration needs — every call is checked against this user's " +
        "record rules.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint:
        "Odoo → Preferences (My Profile) → Account Security → New API Key. Used in place of the " +
        "password. On Odoo Online, users have no local password by default, so an API key is " +
        "normally the only thing that works.",
    },
  ],

  /**
   * Turn the four pasted values into the stored credential, resolving the uid
   * `execute_kw` needs. This is the only place the login→uid lookup happens.
   */
  async exchange({ fields }, ctx) {
    const raw = (fields ?? {}) as Record<string, string>;
    const instanceUrl = resolveInstanceUrl(raw.instanceUrl);
    const database = (raw.database ?? "").trim();
    const username = (raw.username ?? "").trim();
    const apiKey = raw.apiKey ?? "";

    if (!database) throw new Error("Database is required.");
    if (!username) throw new Error("Login is required.");
    if (!apiKey) throw new Error("API Key is required.");

    const cred: OdooCredential = { instanceUrl, database, username, apiKey };
    const uid = await authenticate(ctx, cred);
    if (uid === false) {
      throw new Error(
        "Odoo rejected these credentials. Check the database name and that the API key belongs " +
          "to this login — on Odoo Online, users have no local password, so an API key is required.",
      );
    }

    cred.uid = uid;
    cred.serverVersion = await serverVersion(ctx, cred);
    return cred;
  },

  /**
   * `common.authenticate` — the liveness probe, and deliberately the same call
   * `exchange` makes.
   *
   * It is the right one precisely because it needs no permission beyond
   * existing: it is served by the unauthenticated `common` service and answers
   * only "are these credentials valid". Probing a model instead (say a
   * `res.partner` read) would report a perfectly good credential as broken
   * whenever the bot user's record rules happen not to cover that model — which
   * is the normal, recommended configuration.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<OdooCredential>;
    if (!cred?.instanceUrl || !cred.database || !cred.username || !cred.apiKey) {
      return { ok: false, message: "credential missing instanceUrl / database / login / API key" };
    }
    try {
      const uid = await authenticate(ctx, cred as OdooCredential);
      if (uid === false) return { ok: false, message: "Odoo rejected the login and API key" };
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  },

  /**
   * Publish the non-secret half of the credential so actions can build a URL.
   *
   * Everything returned here is an identifier, never a secret: the API key is
   * not among them and must not be. The uid is included because it is useful
   * context when debugging a permissions problem, and because it is already
   * public to anyone who can read the instance.
   */
  afterConnect({ credential }) {
    const cred = credential as Partial<OdooCredential>;
    return {
      instanceUrl: cred.instanceUrl,
      database: cred.database,
      username: cred.username,
      uid: cred.uid,
      serverVersion: cred.serverVersion,
    };
  },

  /**
   * The ONLY hook handed the raw credential, and it runs network-less: it
   * rewrites the outbound body and returns it.
   */
  sign({ request, credential }): SignableRequest {
    const cred = credential as OdooCredential;
    // Restated defensively. The client sets this too, but `sign` is the only
    // code that knows the database authoritatively (from the credential), and
    // an Odoo Online instance 404s without it.
    if (cred?.database) request.headers["x-odoo-database"] = cred.database;
    if (typeof request.body === "string" && request.body) {
      request.body = signExecuteKw(request.body, cred);
    }
    return request;
  },
};

export default apiKey;

/** Re-exported for tests that build an envelope to sign. */
export { buildExecuteKwBody, COMMON_SERVICE };
