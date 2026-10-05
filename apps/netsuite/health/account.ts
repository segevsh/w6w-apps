import type { HealthCheckDefinition } from "@w6w/types";
import { accountBase, describeError } from "../lib/client.ts";
import { PROBE_PATH } from "../lib/probe.ts";

/**
 * Is THIS account's REST host reachable?
 *
 * Every account has its own hostname, so "NetSuite is up" and "this account's host answers" are
 * different questions: a wrong or retired account id fails differently from an expired token.
 *
 * The probe is an unsigned `GET /services/rest/system/v1/serverTime`. An unsigned request is
 * expected to be refused, and the refusal is classified from the body, never the status code: a
 * NetSuite error envelope (`o:errorDetails` / `title`+`status`, the shape Oracle documents for
 * `401 INVALID_LOGIN`) proves the REST service parsed the request and answered, so it is a
 * **pass**. Whether the credential works is the derived `auth:*` checks' job.
 *
 * Measured 2026-10-05: an account id that does not exist does not answer at all — the hostname
 * fails DNS resolution (`Could not resolve host`) — so a thrown fetch is reported as a likely
 * wrong or retired account. The unsigned response body of a real account was NOT measured (no
 * account was available); the classification rests on Oracle's documented error envelope.
 */
const account: HealthCheckDefinition = {
  key: "account",
  title: "Account host reachable",
  description:
    "Unsigned request to this connection's account-specific REST host. A NetSuite error " +
    "envelope proves it is serving; an unresolvable host means a wrong or retired account id.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const display = (ctx.connection?.display ?? {}) as { accountId?: string };
    if (!display.accountId) {
      return { state: "unknown", message: "connection records no account id" };
    }

    let base: string;
    try {
      base = accountBase(display.accountId);
    } catch (e) {
      return { state: "unknown", message: (e as Error).message };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}${PROBE_PATH}`, { headers: { accept: "application/json" } });
    } catch (e) {
      return {
        state: "down",
        message: `${new URL(base).host} is unreachable — wrong or retired account id? ${
          e instanceof Error ? e.message : String(e)
        }`,
      };
    }
    if (res.status >= 500) return { state: "down", message: `account host returned ${res.status}` };

    const text = await res.text().catch(() => "");
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch { /* handled below */ }
    const isEnvelope = typeof body === "object" && body !== null &&
      (describeError(body).code !== undefined ||
        typeof (body as { title?: unknown }).title === "string" ||
        typeof (body as { serverTime?: unknown }).serverTime === "string");
    if (isEnvelope) return { state: "ok", ttlSeconds: 120 };
    if (text.trimStart().startsWith("<")) {
      return {
        state: "down",
        message: `account host returned markup rather than JSON (HTTP ${res.status})`,
      };
    }
    return {
      state: "unknown",
      message: `account host returned HTTP ${res.status} with no readable NetSuite envelope`,
    };
  },
};

export default account;
