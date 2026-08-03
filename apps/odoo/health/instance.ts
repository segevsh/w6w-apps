import type { HealthCheckDefinition } from "@w6w/types";
import {
  buildCommonBody,
  jsonRpcUrl,
  type OdooConnectionDisplay,
  unwrapRpc,
} from "../lib/client.ts";

/**
 * Is THIS connection's Odoo instance reachable, and is its RPC endpoint alive?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — not `service`. There is no shared vendor platform
 *     whose state this reports. Every Connection points at a different Odoo
 *     server (a self-hosted box, or one tenant's Odoo Online instance), and its
 *     availability is a property of that deployment.
 *   - `scope: "connection"` — follows directly: there is no app-wide answer to
 *     share, because there is no app-wide instance.
 *   - `credential: "context"` — the posture a boolean would lose. This check
 *     needs the Connection to know WHICH host to call, and needs no credential
 *     to interpret the reply. `sign` must not run.
 *   - No `network.allow` of its own: the instance is already reachable under the
 *     app's allowlist, and a `context` check is unsigned regardless.
 *   - `severity` defaults to `degraded` for this kind, which is right. The
 *     derived `auth:*` check already covers "the credential stopped working";
 *     this one stays advisory and answers a different question.
 *
 * ## Why `common.version` is the correct probe
 *
 * It is served by Odoo's **unauthenticated** `common` service, so it works
 * before anyone has connected and cannot fail for want of a permission. A
 * single call separates three failures that a credential check would conflate:
 *
 *   - the host does not resolve, or TLS fails    → transport error
 *   - the host answers but is not Odoo, or has   → non-JSON body, or a JSON-RPC
 *     `/jsonrpc` disabled behind a proxy            error object
 *   - the named database does not exist on it    → Odoo's own 404 for that case
 *
 * Any of those is a very different problem from a bad API key, which is what
 * `auth:*` reports.
 *
 * Verified live on 2026-08-03 against an Odoo Online instance: an unauthenticated
 * `{"service":"common","method":"version","args":[]}` returned
 * `{"result":{"server_version":"saas~19.3+e", ...}}` with no credentials of any
 * kind on the request. The same call WITHOUT the `X-Odoo-Database` header
 * returned `404 … No database is selected`, which is why the header is set here
 * from the redacted connection metadata.
 */
const instance: HealthCheckDefinition = {
  key: "instance",
  title: "Odoo instance reachable",
  description:
    "Unauthenticated `common.version` JSON-RPC call against this connection's Odoo instance — " +
    "proves the host resolves, that /jsonrpc is enabled, and that the database is served.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as OdooConnectionDisplay;
    if (!display.instanceUrl) {
      return { state: "unknown", message: "connection records no instance URL" };
    }

    let url: string;
    try {
      url = jsonRpcUrl(display.instanceUrl);
    } catch (err) {
      return { state: "unknown", message: err instanceof Error ? err.message : String(err) };
    }

    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/json",
    };
    if (display.database) headers["x-odoo-database"] = display.database;

    let res: Response;
    try {
      res = await ctx.fetch(url, {
        method: "POST",
        headers,
        body: buildCommonBody("version", []),
      });
    } catch (err) {
      // The host is unreachable — that IS the instance being down.
      return { state: "down", message: err instanceof Error ? err.message : String(err) };
    }

    if (res.status >= 500) {
      return { state: "down", message: `instance returned ${res.status}`, ttlSeconds: 120 };
    }

    let version: { server_version?: string } | undefined;
    try {
      version = unwrapRpc<{ server_version?: string }>(res.status, await res.text());
    } catch (err) {
      // Reached something, but not a working Odoo RPC endpoint: /jsonrpc
      // disabled, a proxy in front, or the database not served.
      return {
        state: "down",
        message: err instanceof Error ? err.message : String(err),
        ttlSeconds: 120,
      };
    }

    return {
      state: "ok",
      message: version?.server_version ? `Odoo ${version.server_version}` : undefined,
      ttlSeconds: 120,
    };
  },
};

export default instance;
