import type { AuthDefinition } from "@w6w/types";
import { describeQueryError, normalizeHost } from "../lib/query.ts";

/**
 * A service's own database user — the query interface.
 *
 * ## This is a database login, not an API credential
 *
 * The host, a username and a password, exactly as a driver would use. The
 * default user ClickHouse Cloud creates is `default`, and its password is shown
 * once when the service is created.
 *
 * ## The port is 8443 and the hostname does not carry it
 *
 * The console shows `{id}.{region}.{cloud}.clickhouse.cloud`. HTTPS is on
 * **8443**, so a host pasted without the port reaches 443 and nothing answers.
 * This adds it when it is missing.
 *
 * ## The IP access list applies to this and not to the API key
 *
 * A ClickHouse Cloud service has an allowlist of source addresses, and a
 * service created through the console defaults to allowing nothing. A
 * connection from a workflow host that is not on it does not fail to
 * authenticate — it fails to **connect**, which looks like the service being
 * down. `service-get` reports the list, and `ip-access-list-set` changes it.
 *
 * ## A read-only user is the right shape for most workflows
 *
 * ClickHouse supports per-user grants, and a workflow that queries should not
 * hold a user that can `DROP TABLE`. That is configured in SQL rather than
 * here, but it is the thing worth doing before pointing an automation at
 * production.
 */
interface ServiceCredential {
  host: string;
  username: string;
  password: string;
}

const service: AuthDefinition = {
  key: "service",
  type: "basic",
  displayName: "Service Credentials",
  description:
    "A service's host, database user and password, for running SQL over ClickHouse's HTTP " +
    "interface. HTTPS is on port 8443, not 443, and the service's IP ACCESS LIST must include " +
    "this host or the connection fails rather than the login.",
  connectionLabel: "{{username}}@{{host}}",
  fields: [
    {
      key: "host",
      label: "Service Host",
      type: "string",
      required: true,
      default: "",
      placeholder: "abc123.eu-west-1.aws.clickhouse.cloud",
      hint: "From the console's Connect dialog. Port 8443 is added if you leave it off — a host " +
        "without it reaches 443, where nothing answers.",
    },
    {
      key: "username",
      label: "Username",
      type: "string",
      required: true,
      default: "default",
      hint: "The database user. Prefer one with only the grants the workflow needs.",
    },
    {
      key: "password",
      label: "Password",
      type: "secret",
      required: true,
      hint: "Shown once when the service is created; it can be reset from the console.",
    },
  ],

  sign({ request, credential }) {
    const { username, password } = credential as ServiceCredential;
    request.headers["authorization"] = `Basic ${btoa(`${username}:${password}`)}`;
    return request;
  },

  /** `SELECT 1` — the smallest statement that proves host, user and password. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<ServiceCredential> | undefined;
    if (!cred?.host) return { ok: false, message: "credential missing the service host" };
    if (!cred?.username) return { ok: false, message: "credential missing the username" };
    if (!cred?.password) return { ok: false, message: "credential missing the password" };

    let host: string;
    try {
      host = normalizeHost(cred.host);
    } catch (err) {
      return { ok: false, message: String(err) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${host}/?default_format=JSON&wait_end_of_query=1`, {
        method: "POST",
        headers: {
          authorization: `Basic ${btoa(`${cred.username}:${cred.password}`)}`,
          "content-type": "text/plain; charset=utf-8",
        },
        body: "SELECT version() AS version, currentUser() AS user",
      });
    } catch (err) {
      return {
        ok: false,
        message: `could not reach ${host}: ${String(err)}. Two usual causes: the port — HTTPS is ` +
          "8443, not 443 — and the service's IP access list, which blocks the connection rather " +
          "than the login, and defaults to allowing nothing",
      };
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return {
        ok: false,
        message: describeQueryError(
          res.status,
          text,
          res.headers.get("x-clickhouse-exception-code"),
        ),
      };
    }

    interface VersionRow {
      data?: Array<{ version?: string; user?: string }>;
    }
    let body: VersionRow | null = null;
    try {
      body = JSON.parse(text) as VersionRow;
    } catch {
      return { ok: false, message: "ClickHouse did not return JSON" };
    }
    const row = body?.data?.[0];
    return {
      ok: true,
      message: `connected as ${row?.user ?? cred.username} to ClickHouse ${
        row?.version ?? "(version unknown)"
      }`,
    };
  },

  /** Record the host and user, so an action knows this is a query connection. */
  afterConnect({ credential }) {
    const cred = credential as Partial<ServiceCredential>;
    try {
      return {
        host: normalizeHost(cred?.host),
        username: cred?.username,
        plane: "query",
      };
    } catch {
      return {};
    }
  },
};

export default service;
